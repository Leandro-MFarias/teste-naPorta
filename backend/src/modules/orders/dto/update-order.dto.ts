import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/enums.js';
import type { UpdateOrderRequest } from '../interfaces/order-request.interface.js';
import { CreateOrderDto } from './create-order.dto.js';

/**
 * Todos os campos de criação passam a ser opcionais. Com
 * skipNullProperties: false, só `undefined` é ignorado: `null` é validado
 * e rejeitado, evitando apagar campos obrigatórios. `items: []` continua
 * rejeitado pelo ArrayMinSize herdado.
 */
export class UpdateOrderDto
  extends PartialType(CreateOrderDto, { skipNullProperties: false })
  implements UpdateOrderRequest
{
  @ApiPropertyOptional({
    enum: OrderStatus,
    enumName: 'OrderStatus',
    description:
      'Novo status; precisa ser uma transição permitida a partir do status atual.',
  })
  // Como nos campos herdados: omitido é ignorado, null é rejeitado.
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(OrderStatus, {
    message: 'status deve ser um status de pedido válido',
  })
  status?: OrderStatus;
}
