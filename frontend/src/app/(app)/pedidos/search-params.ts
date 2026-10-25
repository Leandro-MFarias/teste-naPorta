import type { ListOrdersQuery, OrderStatus } from '@/lib/api/types';
import { isOrderStatus } from '@/lib/order-status';

export interface OrderFilters {
  page: number;
  orderNumber?: string;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}

export const PAGE_SIZE = 10;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text || undefined;
}

/** Lê os filtros da URL, descartando valores que a API rejeitaria. */
export function parseOrderFilters(params: SearchParams): OrderFilters {
  const page = Number(first(params.page));
  const status = first(params.status);
  const startDate = first(params.startDate);
  const endDate = first(params.endDate);

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    orderNumber: first(params.orderNumber)?.slice(0, 50),
    status: isOrderStatus(status) ? status : undefined,
    startDate: startDate && DATE_ONLY.test(startDate) ? startDate : undefined,
    endDate: endDate && DATE_ONLY.test(endDate) ? endDate : undefined,
  };
}

export function toListQuery(filters: OrderFilters): ListOrdersQuery {
  return { ...filters, limit: PAGE_SIZE };
}

/** URL da listagem com os filtros atuais e outra página. */
export function pageHref(filters: OrderFilters, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) {
    if (value !== undefined && !(key === 'page' && value === 1)) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `/pedidos?${qs}` : '/pedidos';
}
