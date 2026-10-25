import type { OrderStatus } from './api/types';

/** Mesma ordem e regras do backend (seção 7). DELIVERED e CANCELED são finais. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PREPARATION',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
];

export const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['IN_PREPARATION', 'CANCELED'],
  IN_PREPARATION: ['SHIPPED', 'CANCELED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELED: [],
};

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

/** Rótulo do botão que leva ao status. */
export const ORDER_STATUS_ACTIONS: Readonly<Record<OrderStatus, string>> = {
  PENDING: 'Voltar para pendente',
  CONFIRMED: 'Confirmar pedido',
  IN_PREPARATION: 'Iniciar preparação',
  SHIPPED: 'Marcar como enviado',
  DELIVERED: 'Marcar como entregue',
  CANCELED: 'Cancelar pedido',
};

/** Fluxo principal exibido na linha do tempo (sem o cancelamento). */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PREPARATION',
  'SHIPPED',
  'DELIVERED',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
