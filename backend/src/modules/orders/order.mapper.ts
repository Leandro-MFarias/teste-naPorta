import type {
  Customer,
  Order,
  OrderItem,
} from '../../generated/prisma/client.js';
import type { OrderResponse } from './interfaces/order-response.interface.js';

export type OrderWithRelations = Order & {
  customer: Customer;
  items: OrderItem[];
};

/**
 * Monta explicitamente o objeto público do pedido. Não expõe deletedAt nem
 * campos internos do cliente (ex.: ordersCount).
 */
export function toOrderResponse(order: OrderWithRelations): OrderResponse {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    // Coluna DATE: o Prisma devolve meia-noite UTC do dia.
    expectedDeliveryDate: order.expectedDeliveryDate.toISOString().slice(0, 10),
    deliveryAddress: order.deliveryAddress,
    status: order.status,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      document: order.customer.document,
      type: order.customer.type,
    },
    items: order.items.map((item) => ({
      id: item.id,
      description: item.description,
      price: item.price.toFixed(2),
    })),
    createdById: order.createdById,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
