import type { OrderStatus } from '../../../generated/prisma/enums.js';
import type { OrderResponse } from '../../orders/interfaces/order-response.interface.js';
import { ORDER_STATUS_LABELS } from '../../orders/order-status.js';
import type { EmailMessage } from '../email-sender.js';
import {
  renderEmailLayout,
  renderEmailText,
  type EmailLayoutData,
  type EmailRow,
  type EmailSection,
} from './email-layout.js';

/**
 * Por que o cliente está recebendo o pedido:
 * - NEW_CUSTOMER: cliente cadastrado agora, junto com o pedido;
 * - NEW_ORDER: cliente já existente recebeu um novo pedido;
 * - ASSIGNED: um pedido existente passou para este cliente (PATCH).
 */
export type OrderCreatedReason = 'NEW_CUSTOMER' | 'NEW_ORDER' | 'ASSIGNED';

const INTROS: Record<OrderCreatedReason, (orderNumber: string) => string> = {
  NEW_CUSTOMER: (n) =>
    `Seu cadastro foi criado e recebemos o seu pedido ${n}. Confira os detalhes abaixo:`,
  NEW_ORDER: (n) =>
    `Recebemos um novo pedido para você: ${n}. Confira os detalhes abaixo:`,
  ASSIGNED: (n) =>
    `O pedido ${n} foi vinculado ao seu cadastro. Confira os detalhes abaixo:`,
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** "199.90" -> "R$ 199,90" (soma em centavos, sem erro de ponto flutuante). */
function formatCents(cents: number): string {
  return currency.format(cents / 100);
}

function toCents(price: string): number {
  return Math.round(Number(price) * 100);
}

/** "2026-11-15" -> "15/11/2026" */
function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function orderSections(order: OrderResponse): EmailSection[] {
  const totalCents = order.items.reduce(
    (sum, item) => sum + toCents(item.price),
    0,
  );
  const itemRows: EmailRow[] = order.items.map((item) => ({
    label: item.description,
    value: formatCents(toCents(item.price)),
  }));

  return [
    {
      heading: 'Detalhes do pedido',
      rows: [
        { label: 'Número do pedido', value: order.orderNumber },
        { label: 'Status', value: ORDER_STATUS_LABELS[order.status] },
        {
          label: 'Previsão de entrega',
          value: formatDate(order.expectedDeliveryDate),
        },
        { label: 'Endereço de entrega', value: order.deliveryAddress },
      ],
    },
    {
      heading: 'Itens',
      rows: [
        ...itemRows,
        { label: 'Total', value: formatCents(totalCents), strong: true },
      ],
    },
  ];
}

function toMessage(to: string, layout: EmailLayoutData): EmailMessage {
  return {
    to,
    subject: layout.title,
    html: renderEmailLayout(layout),
    text: renderEmailText(layout),
  };
}

/** Pedido recebido: enviado ao cliente quando um pedido passa a ser dele. */
export function buildOrderCreatedEmail(
  order: OrderResponse,
  to: string,
  reason: OrderCreatedReason,
): EmailMessage {
  return toMessage(to, {
    title: `Pedido ${order.orderNumber} recebido`,
    greeting: `${order.customer.name},`,
    intro: INTROS[reason](order.orderNumber),
    highlight: { label: 'Status', value: ORDER_STATUS_LABELS[order.status] },
    sections: orderSections(order),
  });
}

/** Atualização de status: enviado ao cliente a cada mudança de status. */
export function buildOrderStatusEmail(
  order: OrderResponse,
  to: string,
  previousStatus: OrderStatus,
): EmailMessage {
  const label = ORDER_STATUS_LABELS[order.status];
  return toMessage(to, {
    title: `Pedido ${order.orderNumber}: ${label}`,
    greeting: `${order.customer.name},`,
    intro: `O status do seu pedido ${order.orderNumber} mudou de "${ORDER_STATUS_LABELS[previousStatus]}" para "${label}".`,
    highlight: { label: 'Novo status', value: label },
    sections: orderSections(order),
  });
}
