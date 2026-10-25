import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary:
    'border border-ink-200 bg-white text-ink-800 shadow-sm hover:border-brand-300 hover:bg-brand-50',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props} />
  );
}
