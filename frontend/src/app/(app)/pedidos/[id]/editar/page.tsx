import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { ResetOnHide } from '@/components/reset-on-hide';
import { CardSkeleton } from '@/components/ui/skeleton';
import { updateOrderAction } from '../../actions';
import { OrderForm } from '../../order-form';
import { orderToValues } from '../../order-form-values';
import { getOrderOrNotFound } from '../order-data';

export const metadata: Metadata = { title: 'Editar pedido' };

export default function EditOrderPage(
  props: PageProps<'/pedidos/[id]/editar'>,
) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense
        fallback={
          <div className="space-y-6">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={3} />
          </div>
        }
      >
        <EditOrder params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditOrder({
  params,
}: Pick<PageProps<'/pedidos/[id]/editar'>, 'params'>) {
  const { id } = await params;
  const order = await getOrderOrNotFound(id);

  return (
    <>
      <PageHeader
        title={`Editar ${order.orderNumber}`}
        description="Os itens enviados substituem todos os itens atuais. O status é alterado na página do pedido."
        back={{ href: `/pedidos/${order.id}`, label: order.orderNumber }}
      />
      <ResetOnHide>
        <OrderForm
          initialValues={orderToValues(order)}
          action={updateOrderAction.bind(null, order.id)}
          submitLabel="Salvar alterações"
          cancelHref={`/pedidos/${order.id}`}
        />
      </ResetOnHide>
    </>
  );
}
