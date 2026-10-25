import type { OrderStatus } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';

/** Tons quentes da marca para o fluxo; verde e vermelho para os finais. */
const styles: Record<OrderStatus, string> = {
  PENDING: 'bg-ink-100 text-ink-700 ring-ink-200',
  CONFIRMED: 'bg-brand-50 text-brand-700 ring-brand-200',
  IN_PREPARATION: 'bg-brand-100 text-brand-800 ring-brand-300',
  SHIPPED: 'bg-brand-500 text-white ring-brand-500',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELED: 'bg-red-50 text-red-700 ring-red-200',
};

const dots: Record<OrderStatus, string> = {
  PENDING: 'bg-ink-400',
  CONFIRMED: 'bg-brand-400',
  IN_PREPARATION: 'bg-brand-600',
  SHIPPED: 'bg-white',
  DELIVERED: 'bg-emerald-500',
  CANCELED: 'bg-red-500',
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        styles[status],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dots[status])} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
