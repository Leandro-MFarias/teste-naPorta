'use client';

import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FormState } from '@/lib/form-state';
import { deleteOrderAction } from '../actions';

/** Exclusão lógica (somente ADMIN), com confirmação em duas etapas. */
export function DeleteOrderButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>({});

  function remove() {
    startTransition(async () => {
      setResult(await deleteOrderAction(orderId));
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="secondary"
        onClick={() => setConfirming(true)}
        className="text-red-700 hover:border-red-200 hover:bg-red-50"
      >
        Excluir
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:w-80">
      <p className="text-sm text-red-800">
        Excluir o pedido <strong>{orderNumber}</strong>? Ele deixa de aparecer
        na listagem e o número continua reservado.
      </p>
      {result.errors && <Alert tone="error" messages={result.errors} />}
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
          {pending && <Spinner />}
          Sim, excluir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
