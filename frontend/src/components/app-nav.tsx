'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  {
    href: '/pedidos',
    label: 'Pedidos',
    icon: 'M20 7 12 3 4 7m16 0v10l-8 4m8-14-8 4m0 10L4 17V7m8 14V11M4 7l8 4',
  },
  {
    href: '/pedidos/novo',
    label: 'Novo pedido',
    icon: 'M12 5v14M5 12h14',
  },
  {
    href: '/usuarios/novo',
    label: 'Novo usuário',
    icon: 'M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-3v6m3-3h-6',
    adminOnly: true,
  },
  {
    href: '/perfil',
    label: 'Meu perfil',
    icon: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  },
];

/** O item ativo é o de href mais longo que casa com a rota atual. */
function activeHref(pathname: string, items: NavItem[]): string | undefined {
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AppNav({
  isAdmin,
  layout,
}: {
  isAdmin: boolean;
  /** sidebar: lista vertical; bar: pílulas horizontais (mobile). */
  layout: 'sidebar' | 'bar';
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const active = activeHref(pathname, items);

  return (
    <nav
      aria-label="Principal"
      className={cn(
        layout === 'sidebar'
          ? 'space-y-1'
          : 'flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none]',
      )}
    >
      {items.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg text-sm transition-colors',
              layout === 'sidebar' ? 'px-3 py-2' : 'shrink-0 px-3 py-1.5',
              isActive
                ? 'bg-brand-500/15 font-medium text-brand-300'
                : 'text-ink-300 hover:bg-white/5 hover:text-white',
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(
                'size-5 shrink-0',
                layout === 'bar' && 'hidden',
                isActive ? 'text-brand-400' : 'text-ink-400',
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
