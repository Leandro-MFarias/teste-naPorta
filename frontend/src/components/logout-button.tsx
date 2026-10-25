import { logoutAction } from '@/lib/actions/session';
import { cn } from '@/lib/cn';

/** Logout por Server Action (POST), para não ser disparado por prefetch. */
export function LogoutButton({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'link';
}) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={cn(
          variant === 'link'
            ? 'font-medium text-brand-600 hover:underline'
            : 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-white/5 hover:text-white',
        )}
      >
        {variant === 'sidebar' && (
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l-5-5 5-5" />
            <path d="M5 12h11" />
          </svg>
        )}
        Sair
      </button>
    </form>
  );
}
