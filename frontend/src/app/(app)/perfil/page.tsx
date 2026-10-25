import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChangePasswordForm } from '@/components/change-password-form';
import { LogoutButton } from '@/components/logout-button';
import { PageHeader } from '@/components/page-header';
import { ResetOnHide } from '@/components/reset-on-hide';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/dal';
import { formatDateTime, initials } from '@/lib/format';
import { changePasswordAction } from './actions';

export const metadata: Metadata = { title: 'Meu perfil' };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Meu perfil" description="Seus dados de acesso." />
      <div className="space-y-6">
        <Suspense fallback={<CardSkeleton rows={3} />}>
          <ProfileCard />
        </Suspense>
        <Card>
          <CardHeader
            title="Trocar senha"
            description="A sessão atual continua ativa depois da troca."
          />
          <CardBody>
            <ResetOnHide>
              <ChangePasswordForm
                action={changePasswordAction}
                currentLabel="Senha atual"
                submitLabel="Alterar senha"
              />
            </ResetOnHide>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

async function ProfileCard() {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN';

  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-linear-to-r from-ink-800 via-ink-800 to-brand-600" />
      <CardBody className="-mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="grid size-20 place-items-center rounded-2xl border-4 border-white bg-brand-500 text-2xl font-semibold text-white shadow-sm">
              {initials(user.name)}
            </span>
            <div className="pb-1">
              <h2 className="text-lg font-semibold text-ink-900">
                {user.name}
              </h2>
              <p className="text-sm text-ink-500">{user.email}</p>
            </div>
          </div>
          <span
            className={
              isAdmin
                ? 'self-start rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white sm:self-auto'
                : 'self-start rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 ring-inset sm:self-auto'
            }
          >
            {isAdmin ? 'Administrador' : 'Usuário'}
          </span>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-ink-100 pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
              Conta criada em
            </dt>
            <dd className="mt-0.5 text-ink-900">
              {formatDateTime(user.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
              Última atualização
            </dt>
            <dd className="mt-0.5 text-ink-900">
              {formatDateTime(user.updatedAt)}
            </dd>
          </div>
        </dl>
        <div className="mt-5 rounded-lg bg-ink-800 lg:hidden">
          <LogoutButton />
        </div>
      </CardBody>
    </Card>
  );
}
