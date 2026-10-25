/**
 * Contratos da API naPorta (espelham as interfaces do backend). Datas
 * chegam como string ISO 8601 no JSON.
 */

export type Role = 'ADMIN' | 'USER';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELED';

export type CustomerType = 'PERSON' | 'COMPANY';

export type ApiWarningCode = 'CUSTOMER_NAME_UPDATED' | 'CUSTOMER_EMAIL_UPDATED';

export interface ApiWarning {
  code: ApiWarningCode;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  warnings?: ApiWarning[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Validade do token em segundos. */
  expiresIn: number;
  user: User;
}

export interface OrderCustomer {
  id: string;
  name: string;
  /** CPF ou CNPJ sem pontuação. */
  document: string;
  email: string | null;
  type: CustomerType;
}

export interface OrderItem {
  id: string;
  description: string;
  /** Decimal serializado como string (ex.: "19.90"). */
  price: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  /** YYYY-MM-DD. */
  expectedDeliveryDate: string;
  deliveryAddress: string;
  status: OrderStatus;
  customer: OrderCustomer;
  items: OrderItem[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPayload {
  orderNumber: string;
  expectedDeliveryDate: string;
  deliveryAddress: string;
  customer: { name: string; document: string; email: string };
  items: { description: string; price: number }[];
}

export interface ListOrdersQuery {
  page?: number;
  limit?: number;
  orderNumber?: string;
  startDate?: string;
  endDate?: string;
  status?: OrderStatus;
}
