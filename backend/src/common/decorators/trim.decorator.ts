import { Transform } from 'class-transformer';

/**
 * Remove espaços nas extremidades de strings. Outros tipos passam
 * inalterados para que o validador do campo os rejeite.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/** Como @Trim(), convertendo também para minúsculas (ex.: email). */
export function TrimLowerCase(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
