import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-ink-200/70 bg-white shadow-sm',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}
