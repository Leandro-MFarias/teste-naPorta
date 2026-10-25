import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetOnHide } from '@/components/reset-on-hide';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

const REASONS: Record<string, string> = {
  'sessao-expirada': 'Sua sessão expirou. Entre novamente para continuar.',
  saiu: 'Você saiu da sua conta.',
};

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Bem-vindo de volta
      </h1>
      <p className="mt-1 mb-8 text-sm text-ink-500">
        Entre com o email e a senha da sua conta.
      </p>
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormWithParams searchParams={props.searchParams} />
      </Suspense>
      <p className="mt-8 text-center text-xs text-ink-400">
        Não tem acesso? Peça a um administrador para cadastrar você.
      </p>
    </>
  );
}

async function LoginFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<'/login'>['searchParams'];
}) {
  const { motivo, next } = await searchParams;
  const reason = typeof motivo === 'string' ? REASONS[motivo] : undefined;
  return (
    <ResetOnHide>
      <LoginForm notice={reason} next={typeof next === 'string' ? next : ''} />
    </ResetOnHide>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-10" />
    </div>
  );
}
