import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { isPeriodDate, isStartAfterEnd } from './order-period.js';

/** Valida YYYY-MM-DD ou data/hora ISO 8601 com fuso (Z ou ±HH:MM). */
export function IsPeriodDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isPeriodDate',
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isPeriodDate(value);
        },
      },
    });
  };
}

/**
 * Rejeita o fim do período anterior ao início informado em `startProperty`.
 * Só compara quando as duas datas são válidas; o formato é validado à parte.
 */
export function IsNotBefore(
  startProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isNotBefore',
      target: target.constructor,
      propertyName: String(propertyName),
      constraints: [startProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const start = (args.object as Record<string, unknown>)[startProperty];
          if (!isPeriodDate(value) || !isPeriodDate(start)) {
            return true;
          }
          return !isStartAfterEnd(start, value);
        },
      },
    });
  };
}
