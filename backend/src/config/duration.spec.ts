import { describe, expect, it } from 'vitest';
import { parseDurationToSeconds } from './duration.js';

describe('parseDurationToSeconds', () => {
  it.each([
    ['18000s', 18_000],
    ['300m', 18_000],
    ['5h', 18_000],
    ['1d', 86_400],
    [' 5h ', 18_000],
  ])('converte %j para %i segundos', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected);
  });

  it.each(['', '5', '5H', '5 h', '-5h', '1.5h', 'h', '5w', 'abc'])(
    'retorna null para o formato inválido %j',
    (input) => {
      expect(parseDurationToSeconds(input)).toBeNull();
    },
  );
});
