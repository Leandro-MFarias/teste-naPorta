import { describe, expect, it } from 'vitest';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { canTransition, invalidTransitionMessage } from './order-status.js';

const ALLOWED: [OrderStatus, OrderStatus][] = [
  ['PENDING', 'CONFIRMED'],
  ['PENDING', 'CANCELED'],
  ['CONFIRMED', 'IN_PREPARATION'],
  ['CONFIRMED', 'CANCELED'],
  ['IN_PREPARATION', 'SHIPPED'],
  ['IN_PREPARATION', 'CANCELED'],
  ['SHIPPED', 'DELIVERED'],
];

describe('canTransition', () => {
  const statuses = Object.values(OrderStatus);
  const pairs = statuses.flatMap((from) =>
    statuses.map((to) => [from, to] as [OrderStatus, OrderStatus]),
  );

  it.each(pairs)('%s → %s', (from, to) => {
    const expected = ALLOWED.some(([f, t]) => f === from && t === to);
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe('invalidTransitionMessage', () => {
  it('lista os próximos status permitidos', () => {
    expect(invalidTransitionMessage('PENDING', 'SHIPPED')).toBe(
      'Transição de status não permitida: PENDING → SHIPPED. A partir de PENDING, permitido: CONFIRMED, CANCELED.',
    );
  });

  it('informa quando o status atual é final', () => {
    expect(invalidTransitionMessage('DELIVERED', 'CANCELED')).toBe(
      'Transição de status não permitida: DELIVERED é um status final.',
    );
  });
});
