import { Suspense } from 'react';
import { AppNav } from '@/components/app-nav';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/dal';
import { initials } from '@/lib/format';

/**
 * Área autenticada. A barra lateral (tons do card do email) é estática; o
 * que depende do usuário (menu de admin, nome) carrega em Suspense.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-ink-800 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-6">
          <Logo tone="light" />
        </div>
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarContent />
        </Suspense>
      </aside>

      <header className="sticky top-0 z-20 bg-ink-800 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo tone="light" />
          <Suspense>
            <MobileUser />
          </Suspense>
        </div>
        <Suspense fallback={<div className="h-11" />}>
          <MobileNav />
        </Suspense>
      </header>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

async function SidebarContent() {
  const user = await requireUser();
  return (
    <>
      <div className="flex-1 px-3">
        <AppNav isAdmin={user.role === 'ADMIN'} layout="sidebar" />
      </div>
      <div className="space-y-2 border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-ink-400">
              {user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );
}

async function MobileNav() {
  const user = await requireUser();
  return <AppNav isAdmin={user.role === 'ADMIN'} layout="bar" />;
}

async function MobileUser() {
  const user = await requireUser();
  return (
    <span
      className="grid size-8 place-items-center rounded-full bg-brand-500 text-xs font-semibold text-white"
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex-1 space-y-2 px-6" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-8 bg-white/5" />
      ))}
    </div>
  );
}
