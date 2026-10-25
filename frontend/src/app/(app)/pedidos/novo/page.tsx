import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { ResetOnHide } from '@/components/reset-on-hide';
import { createOrderAction } from '../actions';
import { OrderForm } from '../order-form';
import { emptyOrderValues } from '../order-form-values';

export const metadata: Metadata = { title: 'Novo pedido' };

export default function NewOrderPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo pedido"
        description="O pedido começa como Pendente e o cliente recebe a confirmação por email."
        back={{ href: '/pedidos', label: 'Pedidos' }}
      />
      <ResetOnHide>
        <OrderForm
          initialValues={emptyOrderValues()}
          action={createOrderAction}
          submitLabel="Cadastrar pedido"
          cancelHref="/pedidos"
        />
      </ResetOnHide>
    </div>
  );
}
