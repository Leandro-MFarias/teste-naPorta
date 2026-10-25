import { cn } from '@/lib/cn';

/** Marca em texto, como no cabeçalho dos emails, com um ícone de porta. */
export function Logo({
  className,
  tone = 'dark',
}: {
  className?: string;
  /** dark: texto escuro (fundo claro); light: texto claro (fundo escuro). */
  tone?: 'dark' | 'light';
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 font-semibold', className)}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-brand-500 text-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17" />
          <path d="M3 21h18" />
          <path d="M14.5 12h.01" />
        </svg>
      </span>
      <span
        className={cn(
          'text-lg tracking-tight',
          tone === 'dark' ? 'text-ink-900' : 'text-white',
        )}
      >
        na<span className="text-brand-500">Porta</span>
      </span>
    </span>
  );
}
