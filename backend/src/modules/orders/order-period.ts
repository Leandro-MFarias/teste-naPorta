import { isISO8601 } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// Data/hora exige fuso explícito (Z ou ±HH:MM) para não depender do
// fuso do servidor.
const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Filtro de período sobre createdAt, no formato aceito pelo Prisma. */
export interface CreatedAtRange {
  gte?: Date;
  lt?: Date;
  lte?: Date;
}

/** Aceita YYYY-MM-DD ou data/hora ISO 8601 com fuso, de calendário válido. */
export function isPeriodDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (DATE_ONLY.test(value) || DATE_TIME.test(value)) &&
    isISO8601(value, { strict: true }) &&
    !Number.isNaN(Date.parse(value))
  );
}

/** Primeiro instante incluído. YYYY-MM-DD é o início do dia em UTC. */
function periodStart(value: string): Date {
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value);
}

/**
 * Limite superior. YYYY-MM-DD inclui o dia inteiro (UTC): vira "antes do
 * início do dia seguinte", sem perder registros por causa do horário.
 */
function periodEnd(value: string): Pick<CreatedAtRange, 'lt' | 'lte'> {
  if (DATE_ONLY.test(value)) {
    return { lt: new Date(periodStart(value).getTime() + DAY_MS) };
  }
  return { lte: new Date(value) };
}

/** Indica se startDate é posterior a endDate (ambos já validados). */
export function isStartAfterEnd(startDate: string, endDate: string): boolean {
  const start = periodStart(startDate).getTime();
  const { lt, lte } = periodEnd(endDate);
  return lt ? start >= lt.getTime() : start > lte!.getTime();
}

/** Monta o filtro de createdAt; undefined quando nenhuma data foi informada. */
export function toCreatedAtRange(
  startDate?: string,
  endDate?: string,
): CreatedAtRange | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }
  return {
    ...(startDate && { gte: periodStart(startDate) }),
    ...(endDate && periodEnd(endDate)),
  };
}
