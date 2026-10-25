import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClearSearchParams } from '@/components/clear-search-params';
import { PageHeader } from '@/components/page-header';
import { ResetOnHide } from '@/components/reset-on-hide';
import { StatusBadge } from '@/components/status-badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { requireUser } from '@/lib/dal';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  sumItems,
} from '@/lib/format';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { warningMessages } from '@/lib/warnings';
import { DeleteOrderButton } from './delete-order-button';
import { getOrderOrNotFound } from './order-data';
import { StatusActions } from './status-actions';

export const metadata: Metadata = { title: 'Pedido' };

const RESULTS: Record<string, string> = {
  criado: 'Pedido cadastrado. O cliente recebeu a confirmação por email.',
  atualizado: 'Pedido atualizado com sucesso.',
};

export default function OrderPage(props: PageProps<'/pedidos/[id]'>) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <OrderDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function OrderDetail({
  params,
  searchParams,
}: Pick<PageProps<'/pedidos/[id]'>, 'params' | 'searchParams'>) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const order = await getOrderOrNotFound(id);

  const result =
    typeof query.resultado === 'string' ? RESULTS[query.resultado] : undefined;
  const warnings = warningMessages(
    typeof query.avisos === 'string' ? query.avisos : undefined,
    order.customer.type,
  );
  const isFinal = order.status === 'DELIVERED' || order.status === 'CANCELED';

  return (
    <>
      <PageHeader
        back={{ href: '/pedidos', label: 'Pedidos' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.orderNumber}
            <StatusBadge status={order.status} />
          </span>
        }
        description={`Criado em ${formatDateTime(order.createdAt)} · atualizado em ${formatDateTime(order.updatedAt)}`}
        actions={
          <>
            <ButtonLink
              href={`/pedidos/${order.id}/editar`}
              variant="secondary"
            >
              Editar
            </ButtonLink>
            {user.role === 'ADMIN' && (
              <ResetOnHide>
                <DeleteOrderButton
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                />
              </ResetOnHide>
            )}
          </>
        }
      />

      {(result || warnings.length > 0) && (
        <div className="mb-6 space-y-3">
          <ClearSearchParams />
          {result && <Alert tone="success" messages={[result]} />}
          {warnings.length > 0 && (
            <Alert tone="warning" title="Atenção" messages={warnings} />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Andamento"
              description={
                isFinal
                  ? undefined
                  : 'Cada mudança de status é enviada ao cliente por email.'
              }
            />
            <CardBody className="space-y-6">
              <StatusTimeline order={order} />
              <ResetOnHide>
                <StatusActions orderId={order.id} status={order.status} />
              </ResetOnHide>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Itens"
              description={`${order.items.length} ${order.items.length === 1 ? 'item' : 'itens'}`}
            />
            <ul className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-6 py-3 text-sm"
                >
                  <span className="text-ink-800">{item.description}</span>
                  <span className="text-ink-900 tabular-nums">
                    {formatCurrency(item.price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-b-2xl border-t border-ink-100 bg-brand-50/60 px-6 py-4">
              <span className="text-sm font-medium text-ink-700">Total</span>
              <span className="text-lg font-semibold text-brand-700 tabular-nums">
                {formatCurrency(sumItems(order.items))}
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cliente" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Info
                  label={
                    order.customer.type === 'COMPANY' ? 'Razão social' : 'Nome'
                  }
                >
                  {order.customer.name}
                </Info>
                <Info
                  label={order.customer.type === 'COMPANY' ? 'CNPJ' : 'CPF'}
                >
                  {formatDocument(order.customer.document, order.customer.type)}
                </Info>
                <Info label="Email">
                  {order.customer.email ? (
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="break-all text-brand-700 hover:underline"
                    >
                      {order.customer.email}
                    </a>
                  ) : (
                    <span className="text-ink-400">Não informado</span>
                  )}
                </Info>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Entrega" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Info label="Previsão">
                  {formatDate(order.expectedDeliveryDate)}
                </Info>
                <Info label="Endereço">
                  <span className="whitespace-pre-line">
                    {order.deliveryAddress}
                  </span>
                </Info>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink-900">{children}</dd>
    </div>
  );
}

/** Etapas do fluxo principal; no cancelamento, mostra só até onde chegou. */
function StatusTimeline({ order }: { order: Order }) {
  const canceled = order.status === 'CANCELED';
  const current = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Etapas do pedido">
      {ORDER_STATUS_FLOW.map((status, i) => {
        const done = !canceled && i <= current;
        const isCurrent = !canceled && i === current;
        return (
          <li key={status} className="space-y-2">
            <div
              className={cn(
                'h-1.5 rounded-full',
                done ? 'bg-brand-500' : 'bg-ink-100',
                canceled && 'bg-red-100',
              )}
            />
            <p
              className={cn(
                'text-xs',
                isCurrent
                  ? 'font-semibold text-brand-700'
                  : done
                    ? 'text-ink-700'
                    : 'text-ink-400',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {ORDER_STATUS_LABELS[status]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando pedido">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={3} />
      </div>
    </div>
  );
}
