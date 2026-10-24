import { BadRequestException, type Type } from '@nestjs/common';
import { createValidationPipe } from '../src/common/pipes/validation.pipe.js';

const pipe = createValidationPipe();

/**
 * Executa o pipe global sobre `value` como se fosse o body de uma rota que
 * recebe `metatype`. Retorna o DTO transformado ou as mensagens de erro.
 */
export async function validateDto<T>(
  metatype: Type<T>,
  value: unknown,
  type: 'body' | 'query' = 'body',
): Promise<{ dto?: T; errors: string[] }> {
  try {
    const dto = (await pipe.transform(value, { type, metatype })) as T;
    return { dto, errors: [] };
  } catch (error) {
    if (error instanceof BadRequestException) {
      const { message } = error.getResponse() as { message: string[] };
      return { errors: message };
    }
    throw error;
  }
}
