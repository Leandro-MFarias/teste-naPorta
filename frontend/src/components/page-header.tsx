import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-brand-600"
          >
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
