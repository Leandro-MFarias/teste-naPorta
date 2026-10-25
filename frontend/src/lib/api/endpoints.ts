import 'server-only';
import { apiFetch } from './client';
import type {
  ApiResponse,
  ListOrdersQuery,
  LoginResponse,
  Order,
  OrderPayload,
  OrderStatus,
  PaginatedResponse,
  Role,
  User,
} from './types';

export function login(email: string, password: string) {
  return apiFetch<ApiResponse<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function fetchMe() {
  return apiFetch<ApiResponse<User>>('/auth/me');
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<ApiResponse<User>>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export function createUser(body: { name: string; email: string; role: Role }) {
  return apiFetch<ApiResponse<User>>('/users', { method: 'POST', body });
}

export function listOrders(query: ListOrdersQuery) {
  return apiFetch<PaginatedResponse<Order>>('/orders', {
    query: { ...query },
  });
}

export function getOrder(id: string) {
  return apiFetch<ApiResponse<Order>>(`/orders/${encodeURIComponent(id)}`);
}

export function createOrder(body: OrderPayload) {
  return apiFetch<ApiResponse<Order>>('/orders', { method: 'POST', body });
}

export function updateOrder(
  id: string,
  body: Partial<OrderPayload> & { status?: OrderStatus },
) {
  return apiFetch<ApiResponse<Order>>(`/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteOrder(id: string) {
  return apiFetch<void>(`/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
