import type { OrderStatus } from '../../../generated/prisma/enums.js';

/** Dados do cliente informados no pedido (seção 10.1). */
export interface CustomerRequest {
  name: string;
  /** CPF ou CNPJ, com ou sem pontuação. */
  document: string;
  /** Recebe os emails de pedido e de mudança de status. */
  email: string;
}

export interface OrderItemRequest {
  description: string;
  /** Valor não negativo com até duas casas decimais. */
  price: number;
}

/** Request de POST /orders (seção 13.1). Status inicial é sempre PENDING. */
export interface CreateOrderRequest {
  orderNumber: string;
  /** Data no formato YYYY-MM-DD. */
  expectedDeliveryDate: string;
  deliveryAddress: string;
  customer: CustomerRequest;
  items: OrderItemRequest[];
}

/**
 * Request de PATCH /orders/:id (seção 11). Campos omitidos permanecem
 * inalterados; `items`, quando enviado, substitui todos os itens.
 */
export interface UpdateOrderRequest extends Partial<CreateOrderRequest> {
  status?: OrderStatus;
}

/** Query de GET /orders (seção 13.2). */
export interface ListOrdersQuery {
  page: number;
  limit: number;
  orderNumber?: string;
  /** YYYY-MM-DD ou data/hora ISO 8601. */
  startDate?: string;
  /** YYYY-MM-DD (inclui o dia inteiro) ou data/hora ISO 8601. */
  endDate?: string;
  status?: OrderStatus;
}
