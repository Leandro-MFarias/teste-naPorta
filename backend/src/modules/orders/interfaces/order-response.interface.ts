import type {
  CustomerType,
  OrderStatus,
} from '../../../generated/prisma/enums.js';

/** Dados públicos do cliente retornados no pedido. */
export interface OrderCustomerResponse {
  id: string;
  name: string;
  /** CPF ou CNPJ sem pontuação. */
  document: string;
  /** Nulo apenas em clientes cadastrados antes do campo existir. */
  email: string | null;
  type: CustomerType;
}

export interface OrderItemResponse {
  id: string;
  description: string;
  /** Decimal serializado como string para não perder precisão (ex.: "19.90"). */
  price: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  /** Data no formato YYYY-MM-DD. */
  expectedDeliveryDate: string;
  deliveryAddress: string;
  status: OrderStatus;
  customer: OrderCustomerResponse;
  items: OrderItemResponse[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
