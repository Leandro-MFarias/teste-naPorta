import Form from 'next/form';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import type { OrderFilters } from './search-params';

const label = 'mb-1.5 block text-xs font-medium text-ink-500';

/** Filtros por GET: o estado fica na URL (compartilhável e com voltar). */
export function OrderFiltersForm({ filters }: { filters: OrderFilters }) {
  const hasFilters = Boolean(
    filters.orderNumber ||
    filters.status ||
    filters.startDate ||
    filters.endDate,
  );

  return (
    <Form
      action="/pedidos"
      className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <div>
        <label htmlFor="orderNumber" className={label}>
          Número do pedido
        </label>
        <Input
          id="orderNumber"
          name="orderNumber"
          placeholder="Ex.: PED-1001"
          defaultValue={filters.orderNumber}
          maxLength={50}
        />
      </div>
      <div>
        <label htmlFor="status" className={label}>
          Status
        </label>
        <Select id="status" name="status" defaultValue={filters.status ?? ''}>
          <option value="">Todos</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="startDate" className={label}>
          Criado de
        </label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={filters.startDate}
        />
      </div>
      <div>
        <label htmlFor="endDate" className={label}>
          Até
        </label>
        <Input
          id="endDate"
          name="endDate"
          type="date"
          defaultValue={filters.endDate}
          min={filters.startDate}
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
        <button
          type="submit"
          className={buttonClasses('primary', 'md', 'flex-1 lg:flex-none')}
        >
          Filtrar
        </button>
        {hasFilters && (
          <Link href="/pedidos" className={buttonClasses('ghost', 'md')}>
            Limpar
          </Link>
        )}
      </div>
    </Form>
  );
}
