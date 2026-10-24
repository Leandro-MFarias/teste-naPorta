import { registerDecorator, type ValidationOptions } from 'class-validator';
import { parseDocument } from './document.js';

/** Valida CPF ou CNPJ (com ou sem pontuação), incluindo dígitos verificadores. */
export function IsCpfOrCnpj(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isCpfOrCnpj',
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && parseDocument(value) !== null;
        },
      },
    });
  };
}
