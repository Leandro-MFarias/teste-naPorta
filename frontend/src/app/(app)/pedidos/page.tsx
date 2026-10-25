import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ClearSearchParams } from '@/components/clear-search-params';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listOrders } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { Order, PaginatedResponse } from '@/lib/api/types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  sumItems,
} from '@/lib/format';
import { OrderFiltersForm } from './order-filters';
import {
  pageHref,
  parseOrderFilters,
  toListQuery,
  type OrderFilters,
} from './search-params';

export const metadata: Metadata = { title: 'Pedidos' };

export default function OrdersPage(props: PageProps<'/pedidos'>) {
  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Acompanhe e gerencie os pedidos ativos, dos mais recentes aos mais antigos."
        actions={
          <ButtonLink href="/pedidos/novo">
            <span aria-hidden="true">+</span> Novo pedido
          </ButtonLink>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Orders searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({
  searchParams,
}: {
  searchParams: PageProps<'/pedidos'>['searchParams'];
}) {
  const params = await searchParams;
  const filters = parseOrderFilters(params);

  let result: PaginatedResponse<Order> | undefined;
  let errors: string[] | undefined;
  try {
    result = await listOrders(toListQuery(filters));
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
    errors = error.messages;
  }

  return (
    <div className="space-y-5">
      {(params.excluido || params['boas-vindas']) && <ClearSearchParams />}
      {params.excluido && (
        <Alert tone="success" messages={['Pedido excluído.']} />
      )}
      {params['boas-vindas'] && (
        <Alert tone="success" title="Senha alterada com sucesso!">
          Tudo pronto. Sua conta já está liberada para usar o sistema.
        </Alert>
      )}
      {/* key: recria o formulário quando os filtros da URL mudam. */}
      <OrderFiltersForm key={JSON.stringify(filters)} filters={filters} />
      {errors && <Alert tone="error" messages={errors} />}
      {result && <OrdersResult result={result} filters={filters} />}
    </div>
  );
}

function OrdersResult({
  result,
  filters,
}: {
  result: PaginatedResponse<Order>;
  filters: OrderFilters;
}) {
  const { data: orders, meta } = result;
  const filtered = Boolean(
    filters.orderNumber ||
    filters.status ||
    filters.startDate ||
    filters.endDate,
  );

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-500">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7 12 3 4 7m16 0v10l-8 4m8-14-8 4m0 10L4 17V7m8 14V11M4 7l8 4" />
          </svg>
        </div>
        <h2 className="mt-4 font-semibold text-ink-900">
          {meta.total > 0
            ? 'Esta página não tem pedidos'
            : filtered
              ? 'Nenhum pedido encontrado'
              : 'Nenhum pedido ainda'}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {filtered
            ? 'Ajuste os filtros para ver outros pedidos.'
            : 'Cadastre o primeiro pedido para começar.'}
        </p>
        <div className="mt-6">
          {filtered || meta.total > 0 ? (
            <ButtonLink href="/pedidos" variant="secondary">
              Ver todos os pedidos
            </ButtonLink>
          ) : (
            <ButtonLink href="/pedidos/novo">Cadastrar pedido</ButtonLink>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-sm">
      {/* Tabela em telas médias e grandes. */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-ink-100 bg-ink-50/60 text-xs font-medium tracking-wide text-ink-500 uppercase">
          <tr>
            <th className="px-5 py-3">Pedido</th>
            <th className="px-5 py-3">Cliente</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Total</th>
            <th className="px-5 py-3">Entrega prevista</th>
            <th className="px-5 py-3">Criado em</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="group relative transition-colors hover:bg-brand-50/50"
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/pedidos/${order.id}`}
                  className="font-medium text-ink-900 group-hover:text-brand-700 after:absolute after:inset-0"
                >
                  {order.orderNumber}
                </Link>
              </td>
              <td className="px-5 py-3.5">
                <p className="text-ink-900">{order.customer.name}</p>
                <p className="text-xs text-ink-500">
                  {formatDocument(order.customer.document, order.customer.type)}
                </p>
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums">
                <p className="text-ink-900">
                  {formatCurrency(sumItems(order.items))}
                </p>
                <p className="text-xs text-ink-500">
                  {order.items.length}{' '}
                  {order.items.length === 1 ? 'item' : 'itens'}
                </p>
              </td>
              <td className="px-5 py-3.5 text-ink-700">
                {formatDate(order.expectedDeliveryDate)}
              </td>
              <td className="px-5 py-3.5 text-ink-500">
                {formatDateTime(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cards no mobile. */}
      <ul className="divide-y divide-ink-100 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/pedidos/${order.id}`}
              className="block px-4 py-4 transition-colors hover:bg-brand-50/50"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink-900">
                  {order.orderNumber}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-sm text-ink-700">{order.customer.name}</p>
              <div className="mt-2 flex justify-between text-xs text-ink-500">
                <span>Entrega {formatDate(order.expectedDeliveryDate)}</span>
                <span className="font-medium text-ink-900 tabular-nums">
                  {formatCurrency(sumItems(order.items))}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Pagination meta={meta} hrefFor={(page) => pageHref(filters, page)} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando pedidos">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="space-y-3 rounded-2xl border border-ink-200/70 bg-white p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}
