import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { PaginationMeta } from '../interfaces/api-response.interface.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Página, começando em 1.',
    minimum: 1,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro' })
  @Min(1, { message: 'page deve ser maior ou igual a 1' })
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: `Itens por página (máximo ${MAX_LIMIT}).`,
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro' })
  @Min(1, { message: 'limit deve ser maior ou igual a 1' })
  @Max(MAX_LIMIT, { message: `limit deve ser no máximo ${MAX_LIMIT}` })
  limit: number = DEFAULT_LIMIT;
}

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ description: 'Total de registros encontrados.', example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas; 0 quando não há resultados.',
    example: 5,
  })
  totalPages: number;
}
