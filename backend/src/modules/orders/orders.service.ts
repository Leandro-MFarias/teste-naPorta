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
import type { OrderStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { MailService } from '../mail/mail.service.js';
import type { OrderCreatedReason } from '../mail/templates/order-emails.js';
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
    private readonly mail: MailService,
  ) {}

  /**
   * Cria o pedido (status inicial PENDING) em uma única transação:
   * cria/reutiliza o cliente, grava pedido e itens e incrementa
   * ordersCount. Qualquer falha desfaz todas as alterações. Após o commit,
   * o cliente recebe o email do pedido.
   */
  async create(
    request: CreateOrderRequest,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<OrderResponse>> {
    let response: ApiResponse<OrderResponse>;
    let reason: OrderCreatedReason;
    try {
      ({ response, reason } = await this.prisma.$transaction(async (tx) => {
        const { customer, created, warnings } = await this.customers.resolve(
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
          response: withWarnings(
            toOrderResponse({ ...order, customer: updatedCustomer }),
            warnings,
          ),
          reason: created ? 'NEW_CUSTOMER' : 'NEW_ORDER',
        };
      }));
    } catch (error) {
      throw toOrderNumberConflict(error);
    }

    // Só depois do commit: nunca avisar sobre um pedido desfeito. O envio
    // roda em segundo plano e uma falha não afeta a resposta.
    void this.mail.notifyOrderCreated(response.data, reason);
    return response;
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
   * Após o commit, o cliente é avisado da mudança de status ou, se o
   * pedido passou para outro cliente, o novo cliente recebe o pedido.
   */
  async update(
    id: string,
    request: UpdateOrderRequest,
  ): Promise<ApiResponse<OrderResponse>> {
    let response: ApiResponse<OrderResponse>;
    let previousStatus: OrderStatus;
    let customerChanged: boolean;
    try {
      ({ response, previousStatus, customerChanged } =
        await this.prisma.$transaction(async (tx) => {
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
          let warnings: ApiWarning[] = [];
          if (request.customer) {
            const resolved = await this.customers.resolve(tx, request.customer);
            warnings = resolved.warnings;
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
                items: {
                  deleteMany: {},
                  create: request.items.map(toItemData),
                },
              }),
            },
            include: ORDER_INCLUDE,
          });

          return {
            response: withWarnings(toOrderResponse(order), warnings),
            previousStatus: current.status,
            customerChanged: customerId !== current.customerId,
          };
        }));
    } catch (error) {
      throw toOrderNumberConflict(error);
    }

    // Só depois do commit. O novo cliente recebe o pedido completo (com o
    // status atual), então não recebe também o aviso de status.
    if (customerChanged) {
      void this.mail.notifyOrderCreated(response.data, 'ASSIGNED');
    } else if (response.data.status !== previousStatus) {
      void this.mail.notifyOrderStatusChanged(response.data, previousStatus);
    }
    return response;
  }

  /**
   * Exclusão lógica (seção 12): preenche deletedAt e decrementa ordersCount
   * do cliente uma única vez, na mesma transação. O UPDATE condicional a
   * deletedAt IS NULL é atômico: em exclusões concorrentes do mesmo pedido,
   * a segunda espera a primeira, não encontra linha ativa e retorna 404,
   * sem decrementar de novo. O orderNumber continua reservado.
   */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [deleted] = await tx.order.updateManyAndReturn({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
        select: { customerId: true },
      });
      if (!deleted) {
        throw new NotFoundException(ORDER_NOT_FOUND_MESSAGE);
      }

      // O CHECK orders_count >= 0 do banco impede contagem negativa.
      await tx.customer.update({
        where: { id: deleted.customerId },
        data: { ordersCount: { decrement: 1 } },
      });
    });
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

/** Inclui `warnings` na resposta apenas quando houver aviso. */
function withWarnings(
  data: OrderResponse,
  warnings: ApiWarning[],
): ApiResponse<OrderResponse> {
  return warnings.length > 0 ? { data, warnings } : { data };
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
