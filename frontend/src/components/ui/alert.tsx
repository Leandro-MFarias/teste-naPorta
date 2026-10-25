import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AlertTone = 'error' | 'warning' | 'success' | 'info';

const tones: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

const icons: Record<AlertTone, string> = {
  error:
    'M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  warning:
    'M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  success: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  info: 'M11.25 11.25h.75v5.25h.75M12 7.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  /** Lista de mensagens (ex.: erros de validação da API). */
  messages?: string[];
  children?: ReactNode;
  className?: string;
}

export function Alert({
  tone = 'info',
  title,
  messages,
  children,
  className,
}: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm',
        tones[tone],
        className,
      )}
    >
      <svg
        className="mt-0.5 size-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icons[tone]} />
      </svg>
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {messages && messages.length === 1 && <p>{messages[0]}</p>}
        {messages && messages.length > 1 && (
          <ul className="list-disc space-y-0.5 pl-4">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  );
}
