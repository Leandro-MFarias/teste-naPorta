import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type {
  ApiResponse,
  PaginatedResponse,
} from '../../common/interfaces/api-response.interface.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import type {
  CreateOrderRequest,
  ListOrdersQuery,
  OrderItemRequest,
} from './interfaces/order-request.interface.js';
import type { OrderResponse } from './interfaces/order-response.interface.js';
import { toCreatedAtRange } from './order-period.js';
import { toOrderResponse } from './order.mapper.js';

export const ORDER_NUMBER_IN_USE_MESSAGE =
  'Já existe um pedido com este número.';

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
      // O cliente usa ON CONFLICT; a única unicidade que pode falhar aqui
      // é a do número do pedido.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ORDER_NUMBER_IN_USE_MESSAGE);
      }
      throw error;
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
          include: { customer: true, items: true },
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
