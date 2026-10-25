import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { ResetOnHide } from '@/components/reset-on-hide';
import { Card, CardBody } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/dal';
import { UserForm } from './user-form';

export const metadata: Metadata = { title: 'Novo usuário' };

export default function NewUserPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Novo usuário"
        description="Não há cadastro público: só administradores criam contas."
      />
      <Suspense fallback={<CardSkeleton rows={4} />}>
        <AdminOnly />
      </Suspense>
    </div>
  );
}

async function AdminOnly() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <ResetOnHide>
            <UserForm />
          </ResetOnHide>
        </CardBody>
      </Card>
      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        {[
          'O sistema gera uma senha temporária e envia por email.',
          'No primeiro login, a pessoa define a própria senha.',
          'Depois disso, o acesso fica liberado conforme o perfil.',
        ].map((step, i) => (
          <li
            key={step}
            className="flex gap-3 rounded-xl border border-ink-200/70 bg-white p-4"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {i + 1}
            </span>
            <span className="text-ink-600">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
