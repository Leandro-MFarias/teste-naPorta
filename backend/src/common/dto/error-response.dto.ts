import { ApiProperty } from '@nestjs/swagger';
import type { ApiErrorResponse } from '../interfaces/api-response.interface.js';

export class ErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    description:
      'Descrição do erro. Lista de mensagens quando houver múltiplos erros de validação.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['orderNumber é obrigatório', 'items deve ter pelo menos um item'],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Nome do status HTTP.',
    example: 'BAD_REQUEST',
  })
  error: string;
}
