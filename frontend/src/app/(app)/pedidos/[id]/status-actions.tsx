'use client';

import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { OrderStatus } from '@/lib/api/types';
import type { FormState } from '@/lib/form-state';
import {
  ORDER_STATUS_ACTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from '@/lib/order-status';
import { changeStatusAction } from '../actions';

/** Botões das transições permitidas a partir do status atual. */
export function StatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<OrderStatus>();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<FormState>({});
  const next = ORDER_STATUS_TRANSITIONS[status];

  function apply(to: OrderStatus) {
    setTarget(to);
    setConfirming(false);
    startTransition(async () => {
      setResult(await changeStatusAction(orderId, to));
    });
  }

  if (next.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        {status === 'DELIVERED'
          ? 'Pedido entregue. Este é o status final.'
          : 'Pedido cancelado. Este é o status final.'}
      </p>
    );
  }

  const forward = next.filter((s) => s !== 'CANCELED');
  const canCancel = next.includes('CANCELED');

  return (
    <div className="space-y-3">
      {result.errors && <Alert tone="error" messages={result.errors} />}
      {result.success && !pending && (
        <Alert tone="success" messages={[result.success]} />
      )}

      {confirming ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Cancelar este pedido?
          </p>
          <p className="mt-1 text-sm text-red-700">
            O cancelamento é definitivo e o cliente será avisado por email.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => apply('CANCELED')}
            >
              Sim, cancelar pedido
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {forward.map((to) => (
            <Button key={to} onClick={() => apply(to)} disabled={pending}>
              {pending && target === to && <Spinner />}
              {ORDER_STATUS_ACTIONS[to]}
            </Button>
          ))}
          {canCancel && (
            <Button
              variant="secondary"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="text-red-700 hover:border-red-200 hover:bg-red-50"
            >
              {pending && target === 'CANCELED' && <Spinner />}
              {ORDER_STATUS_ACTIONS.CANCELED}
            </Button>
          )}
        </div>
      )}
      {forward.length > 0 && (
        <p className="text-xs text-ink-500">
          Próxima etapa:{' '}
          {forward.map((s) => ORDER_STATUS_LABELS[s]).join(' ou ')}.
        </p>
      )}
    </div>
  );
}
