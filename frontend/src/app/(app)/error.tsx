'use client';

import { Button, ButtonLink } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-xl text-brand-600">
        !
      </div>
      <h1 className="mt-4 text-xl font-semibold text-ink-900">
        Algo deu errado
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Não foi possível carregar esta página. Verifique se a API está no ar e
        tente novamente.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink-400">
          Código: {error.digest}
        </p>
      )}
      <div className="mt-8 flex justify-center gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <ButtonLink href="/pedidos" variant="secondary">
          Ir para pedidos
        </ButtonLink>
      </div>
    </div>
  );
}
