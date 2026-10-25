'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonVariant } from './button';
import { Spinner } from './spinner';

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
  /** Força o estado de envio (ex.: formulários que usam startTransition). */
  pending?: boolean;
}

/** Botão de envio que se desabilita enquanto a Server Action roda. */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  className,
  pending: forcedPending,
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = forcedPending ?? status.pending;

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
