import { ValidationPipe } from '@nestjs/common';

/**
 * Pipe de validação global (seção 15): remove e rejeita campos não
 * declarados nos DTOs e converte o payload para a classe do DTO, aplicando
 * os @Transform/@Type declarados.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Conversões de tipo só onde o DTO declara @Type explicitamente.
    transformOptions: { enableImplicitConversion: false },
  });
}
