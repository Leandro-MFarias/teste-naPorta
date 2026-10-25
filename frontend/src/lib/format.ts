import type { CustomerType } from './api/types';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

const dateOnly = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatCurrency(value: number | string): string {
  return currency.format(Number(value));
}

/** Instante ISO (createdAt/updatedAt) no fuso de Brasília. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Data sem horário (YYYY-MM-DD), sem deslocamento de fuso. */
export function formatDate(day: string): string {
  return dateOnly.format(new Date(`${day}T00:00:00Z`));
}

/** CPF 000.000.000-00 ou CNPJ (inclusive alfanumérico) 00.000.000/0000-00. */
export function formatDocument(document: string, type?: CustomerType): string {
  const value = document.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (type === 'PERSON' || (!type && value.length === 11)) {
    return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return value.replace(
    /^([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z]{3})([0-9A-Z]{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}

/**
 * Máscara progressiva enquanto o usuário digita: até 11 caracteres
 * numéricos formata como CPF; acima disso (ou com letras), como CNPJ.
 */
export function maskDocument(input: string): string {
  const value = input
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 14);
  const isCpf = value.length <= 11 && /^\d*$/.test(value);
  const groups = isCpf ? [3, 3, 3, 2] : [2, 3, 3, 4, 2];
  const separators = isCpf ? ['.', '.', '-'] : ['.', '.', '/', '-'];

  let result = '';
  let index = 0;
  groups.forEach((size, i) => {
    const part = value.slice(index, index + size);
    if (!part) {
      return;
    }
    result += (i > 0 ? separators[i - 1] : '') + part;
    index += size;
  });
  return result;
}

export function sumItems(items: { price: string | number }[]): number {
  // Soma em centavos para não acumular erro de ponto flutuante.
  const cents = items.reduce(
    (acc, item) => acc + Math.round(Number(item.price) * 100),
    0,
  );
  return cents / 100;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
