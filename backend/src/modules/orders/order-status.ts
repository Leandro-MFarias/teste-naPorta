import { OrderStatus } from '../../generated/prisma/enums.js';

/** Transições permitidas (seção 7). DELIVERED e CANCELED são finais. */
export const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  CONFIRMED: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELED],
  IN_PREPARATION: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function invalidTransitionMessage(
  from: OrderStatus,
  to: OrderStatus,
): string {
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  return allowed.length > 0
    ? `Transição de status não permitida: ${from} → ${to}. A partir de ${from}, permitido: ${allowed.join(', ')}.`
    : `Transição de status não permitida: ${from} é um status final.`;
}

/** Nome de cada status para exibição (ex.: emails ao cliente). */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};
