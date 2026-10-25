import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-ink-900 shadow-sm transition-colors placeholder:text-ink-400 focus:outline-none focus:ring-2 disabled:bg-ink-100 disabled:text-ink-500';

function controlClasses(invalid: boolean, className?: string) {
  return cn(
    control,
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
      : 'border-ink-200 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-200',
    className,
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Rótulo + controle + dica/erro, com ids ligados para leitores de tela. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink-700"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-500">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends ComponentProps<'input'> {
  invalid?: boolean;
}

export function Input({
  invalid = false,
  className,
  id,
  ...props
}: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={controlClasses(invalid, cn('h-10', className))}
      {...props}
    />
  );
}

interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean;
}

export function Select({
  invalid = false,
  className,
  id,
  ...props
}: SelectProps) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={controlClasses(invalid, cn('h-10 pr-8', className))}
      {...props}
    />
  );
}

interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
}

export function Textarea({
  invalid = false,
  className,
  id,
  ...props
}: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={controlClasses(invalid, cn('py-2', className))}
      {...props}
    />
  );
}
