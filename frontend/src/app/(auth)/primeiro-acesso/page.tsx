import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ChangePasswordForm } from '@/components/change-password-form';
import { LogoutButton } from '@/components/logout-button';
import { CardSkeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/lib/dal';
import { firstAccessAction } from '../actions';

export const metadata: Metadata = { title: 'Primeiro acesso' };

export default function FirstAccessPage() {
  return (
    <>
      <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 ring-inset">
        Primeiro acesso
      </span>
      <Suspense fallback={<CardSkeleton rows={3} />}>
        <FirstAccess />
      </Suspense>
      <div className="mt-8 flex items-center justify-center gap-1 text-sm text-ink-500">
        Não é você? <LogoutButton variant="link" />
      </div>
    </>
  );
}

async function FirstAccess() {
  const user = await getCurrentUser();
  if (!user.mustChangePassword) {
    redirect('/pedidos');
  }

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-brand-600">
        {user.name.split(' ')[0]},
      </h1>
      <p className="mt-1 mb-8 text-sm text-ink-500">
        Para proteger sua conta, troque a senha temporária que você recebeu por
        email por uma senha só sua.
      </p>
      <ChangePasswordForm
        action={firstAccessAction}
        currentLabel="Senha temporária (do email)"
        submitLabel="Salvar e continuar"
      />
    </>
  );
}
