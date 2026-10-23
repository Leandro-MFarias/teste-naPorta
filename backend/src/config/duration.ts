const UNIT_IN_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

/**
 * Converte uma duração no formato `<número><unidade>` (ex.: `5h`, `300m`,
 * `1d`, `18000s`) para segundos. Retorna `null` se o formato for inválido.
 *
 * A unidade é obrigatória para evitar ambiguidade: o `jsonwebtoken`
 * interpreta números como segundos, mas strings numéricas como milissegundos.
 */
export function parseDurationToSeconds(value: string): number | null {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_IN_SECONDS[unit as keyof typeof UNIT_IN_SECONDS];
}
