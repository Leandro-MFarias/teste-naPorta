import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../../generated/prisma/enums.js';
import type { ListOrdersQuery } from '../interfaces/order-request.interface.js';
import { IsNotBefore, IsPeriodDate } from '../order-period.validator.js';
import { ORDER_NUMBER_MAX_LENGTH } from './create-order.dto.js';

export class ListOrdersQueryDto
  extends PaginationQueryDto
  implements ListOrdersQuery
{
  @ApiPropertyOptional({
    description: 'Busca parcial por trecho do número do pedido.',
    maxLength: ORDER_NUMBER_MAX_LENGTH,
    example: '100',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: 'orderNumber deve ser um texto' })
  @IsNotEmpty({ message: 'orderNumber não pode ser vazio' })
  @MaxLength(ORDER_NUMBER_MAX_LENGTH, {
    message: `orderNumber deve ter no máximo ${ORDER_NUMBER_MAX_LENGTH} caracteres`,
  })
  orderNumber?: string;

  @ApiPropertyOptional({
    description:
      'Início do período de criação (inclusivo). YYYY-MM-DD (início do dia em UTC) ou data/hora ISO 8601 com fuso, ex.: 2026-10-01T08:00:00-03:00.',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsPeriodDate({ message: 'startDate deve ser uma data ISO 8601 válida' })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Fim do período de criação (inclusivo). Com YYYY-MM-DD, inclui o dia inteiro (UTC). Não pode ser anterior a startDate.',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsPeriodDate({ message: 'endDate deve ser uma data ISO 8601 válida' })
  @IsNotBefore('startDate', {
    message: 'endDate não pode ser anterior a startDate',
  })
  endDate?: string;

  @ApiPropertyOptional({ enum: OrderStatus, enumName: 'OrderStatus' })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'status deve ser um status de pedido válido',
  })
  status?: OrderStatus;
}
