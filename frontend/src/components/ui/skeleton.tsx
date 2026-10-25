import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-ink-100', className)}
      aria-hidden="true"
    />
  );
}

/** Bloco genérico de carregamento para cards. */
export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="space-y-4 rounded-2xl border border-ink-200/70 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Carregando"
    >
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
