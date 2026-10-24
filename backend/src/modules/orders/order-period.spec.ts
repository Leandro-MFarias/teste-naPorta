import { describe, expect, it } from 'vitest';
import {
  isPeriodDate,
  isStartAfterEnd,
  toCreatedAtRange,
} from './order-period.js';

describe('isPeriodDate', () => {
  it.each([
    '2026-10-24',
    '2024-02-29',
    '2026-10-24T10:30Z',
    '2026-10-24T10:30:00Z',
    '2026-10-24T10:30:00.123Z',
    '2026-10-24T10:30:00-03:00',
  ])('aceita %s', (value) => {
    expect(isPeriodDate(value)).toBe(true);
  });

  it.each([
    '2026-13-01',
    '2026-02-30',
    '2025-02-29',
    '2026-10',
    '20261024',
    '2026-W43-1',
    '2026-10-24T10:30:00',
    '2026-10-24T25:00:00Z',
    '24/10/2026',
    '',
    123,
  ])('rejeita %o', (value) => {
    expect(isPeriodDate(value)).toBe(false);
  });
});

describe('toCreatedAtRange', () => {
  it('retorna undefined sem datas', () => {
    expect(toCreatedAtRange()).toBeUndefined();
  });

  it('YYYY-MM-DD: início do dia e fim exclusivo no dia seguinte (UTC)', () => {
    expect(toCreatedAtRange('2026-10-01', '2026-10-31')).toEqual({
      gte: new Date('2026-10-01T00:00:00.000Z'),
      lt: new Date('2026-11-01T00:00:00.000Z'),
    });
  });

  it('data/hora: limites exatos e inclusivos', () => {
    expect(
      toCreatedAtRange('2026-10-01T08:00:00-03:00', '2026-10-01T18:00:00Z'),
    ).toEqual({
      gte: new Date('2026-10-01T11:00:00.000Z'),
      lte: new Date('2026-10-01T18:00:00.000Z'),
    });
  });

  it('aceita só um dos limites', () => {
    expect(toCreatedAtRange(undefined, '2026-10-31')).toEqual({
      lt: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(toCreatedAtRange('2026-10-01')).toEqual({
      gte: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('virada de ano e de mês com 31 dias', () => {
    expect(toCreatedAtRange(undefined, '2026-12-31')).toEqual({
      lt: new Date('2027-01-01T00:00:00.000Z'),
    });
  });
});

describe('isStartAfterEnd', () => {
  it.each([
    ['2026-10-10', '2026-10-10', false],
    ['2026-10-10', '2026-10-09', true],
    ['2026-10-10T23:59:59.999Z', '2026-10-10', false],
    ['2026-10-11T00:00:00Z', '2026-10-10', true],
    ['2026-10-10', '2026-10-10T00:00:00Z', false],
    ['2026-10-10T00:00:00.001Z', '2026-10-10T00:00:00Z', true],
  ])('%s > %s = %s', (start, end, expected) => {
    expect(isStartAfterEnd(start, end)).toBe(expected);
  });
});
