import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type {
  ApiResponse,
  ApiWarning,
  PaginatedResponse,
} from '../../common/interfaces/api-response.interface.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import type {
  CreateOrderRequest,
  ListOrdersQuery,
  OrderItemRequest,
  UpdateOrderRequest,
} from './interfaces/order-request.interface.js';
import type { OrderResponse } from './interfaces/order-response.interface.js';
import { toCreatedAtRange } from './order-period.js';
import { canTransition, invalidTransitionMessage } from './order-status.js';
import { toOrderResponse } from './order.mapper.js';

export const ORDER_NUMBER_IN_USE_MESSAGE =
  'Já existe um pedido com este número.';
export const ORDER_NOT_FOUND_MESSAGE = 'Pedido não encontrado.';

const ORDER_INCLUDE = { customer: true, items: true } as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  /**
   * Cria o pedido (status inicial PENDING) em uma única transação:
   * cria/reutiliza o cliente, grava pedido e itens e incrementa
   * ordersCount. Qualquer falha desfaz todas as alterações.
   */
  async create(
    request: CreateOrderRequest,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<OrderResponse>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { customer, warning } = await this.customers.resolve(
          tx,
          request.customer,
        );

        const order = await tx.order.create({
          data: {
            orderNumber: request.orderNumber,
            expectedDeliveryDate: toDateOnly(request.expectedDeliveryDate),
            deliveryAddress: request.deliveryAddress,
            customerId: customer.id,
            // Sempre o usuário autenticado, nunca um valor do body.
            createdById: user.id,
            items: { create: request.items.map(toItemData) },
          },
          include: { items: true },
        });

        const updatedCustomer = await tx.customer.update({
          where: { id: customer.id },
          data: { ordersCount: { increment: 1 } },
        });

        return {
          data: toOrderResponse({ ...order, customer: updatedCustomer }),
          ...(warning && { warnings: [warning] }),
        };
      });
    } catch (error) {
      throw toOrderNumberConflict(error);
    }
  }

  /** Pedido ativo por ID; excluídos logicamente retornam 404. */
  async findOne(id: string): Promise<ApiResponse<OrderResponse>> {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND_MESSAGE);
    }
    return { data: toOrderResponse(order) };
  }

  /**
   * Edição parcial (seção 11), toda em uma transação: campos omitidos não
   * mudam; `items` substitui todos os itens; status só muda por transição
   * permitida; troca de cliente ajusta ordersCount dos dois clientes.
   */
  async update(
    id: string,
    request: UpdateOrderRequest,
  ): Promise<ApiResponse<OrderResponse>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Bloqueia a linha até o fim da transação: edições e exclusões
        // concorrentes do mesmo pedido esperam, em vez de validar a
        // transição ou a contagem sobre um estado desatualizado.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM orders
          WHERE id = ${id}::uuid AND deleted_at IS NULL
          FOR UPDATE`;
        if (locked.length === 0) {
          throw new NotFoundException(ORDER_NOT_FOUND_MESSAGE);
        }
        const current = await tx.order.findUniqueOrThrow({ where: { id } });

        // Reenviar o status atual não é transição: é ignorado.
        if (
          request.status !== undefined &&
          request.status !== current.status &&
          !canTransition(current.status, request.status)
        ) {
          throw new BadRequestException(
            invalidTransitionMessage(current.status, request.status),
          );
        }

        let customerId = current.customerId;
        let warning: ApiWarning | undefined;
        if (request.customer) {
          const resolved = await this.customers.resolve(tx, request.customer);
          warning = resolved.warning;
          customerId = resolved.customer.id;

          if (customerId !== current.customerId) {
            // O CHECK orders_count >= 0 do banco impede contagem negativa.
            await tx.customer.update({
              where: { id: current.customerId },
              data: { ordersCount: { decrement: 1 } },
            });
            await tx.customer.update({
              where: { id: customerId },
              data: { ordersCount: { increment: 1 } },
            });
          }
        }

        const order = await tx.order.update({
          where: { id },
          data: {
            orderNumber: request.orderNumber,
            expectedDeliveryDate:
              request.expectedDeliveryDate !== undefined
                ? toDateOnly(request.expectedDeliveryDate)
                : undefined,
            deliveryAddress: request.deliveryAddress,
            status: request.status,
            customerId,
            // Explícito para que mudanças só nos itens também atualizem.
            updatedAt: new Date(),
            ...(request.items && {
              items: { deleteMany: {}, create: request.items.map(toItemData) },
            }),
          },
          include: ORDER_INCLUDE,
        });

        return {
          data: toOrderResponse(order),
          ...(warning && { warnings: [warning] }),
        };
      });
    } catch (error) {
      throw toOrderNumberConflict(error);
    }
  }

  /**
   * Lista pedidos ativos com filtros combináveis e paginação. Ordena por
   * createdAt desc com id como desempate, para páginas estáveis.
   */
  async findAll(
    query: ListOrdersQuery,
  ): Promise<PaginatedResponse<OrderResponse>> {
    const createdAt = toCreatedAtRange(query.startDate, query.endDate);
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.orderNumber && {
        orderNumber: {
          contains: escapeLikePattern(query.orderNumber),
          mode: 'insensitive',
        },
      }),
      ...(createdAt && { createdAt }),
    };

    // Mesmo snapshot para o total e a página.
    const [total, orders] = await this.prisma.$transaction(
      [
        this.prisma.order.count({ where }),
        this.prisma.order.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: ORDER_INCLUDE,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return {
      data: orders.map(toOrderResponse),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

/**
 * A única unicidade que pode falhar nas escritas de pedido é a do número
 * (o cliente usa ON CONFLICT); as demais exceções seguem inalteradas.
 */
function toOrderNumberConflict(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new ConflictException(ORDER_NUMBER_IN_USE_MESSAGE);
  }
  return error;
}

/**
 * O Prisma não escapa curingas em `contains` (vira ILIKE): sem isto, "%" ou
 * "_" no termo casariam qualquer texto. A barra é o escape padrão do LIKE.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** "YYYY-MM-DD" -> meia-noite UTC, gravada na coluna DATE sem deslocamento. */
function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toItemData(item: OrderItemRequest) {
  return {
    description: item.description,
    // Via string para o Decimal não herdar imprecisão de ponto flutuante.
    price: new Prisma.Decimal(item.price.toFixed(2)),
  };
}
