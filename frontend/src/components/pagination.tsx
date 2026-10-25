import Link from 'next/link';
import type { PaginationMeta } from '@/lib/api/types';
import { cn } from '@/lib/cn';

/** Páginas exibidas: primeira, última e vizinhas da atual, com reticências. */
function pageWindow(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) {
      result.push('…');
    }
    result.push(p);
  });
  return result;
}

const item =
  'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm transition-colors';

export function Pagination({
  meta,
  hrefFor,
}: {
  meta: PaginationMeta;
  hrefFor: (page: number) => string;
}) {
  const { page, limit, total, totalPages } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 sm:flex-row">
      <p className="text-sm text-ink-500">
        <span className="font-medium text-ink-900">
          {from}–{to}
        </span>{' '}
        de <span className="font-medium text-ink-900">{total}</span>
      </p>

      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex items-center gap-1">
          <PageLink
            page={page - 1}
            disabled={page <= 1}
            hrefFor={hrefFor}
            label="Página anterior"
          >
            ‹
          </PageLink>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className={cn(item, 'text-ink-400')}>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  item,
                  p === page
                    ? 'bg-brand-500 font-medium text-white'
                    : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700',
                )}
              >
                {p}
              </Link>
            ),
          )}
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            hrefFor={hrefFor}
            label="Próxima página"
          >
            ›
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  hrefFor,
  label,
  children,
}: {
  page: number;
  disabled: boolean;
  hrefFor: (page: number) => string;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className={cn(item, 'text-ink-300')} aria-hidden="true">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={hrefFor(page)}
      aria-label={label}
      className={cn(
        item,
        'text-ink-600 hover:bg-brand-50 hover:text-brand-700',
      )}
    >
      {children}
    </Link>
  );
}
