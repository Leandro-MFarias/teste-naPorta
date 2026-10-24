import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiWarningDto } from '../../../common/dto/api-warning.dto.js';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto.js';
import type {
  ApiResponse,
  PaginatedResponse,
} from '../../../common/interfaces/api-response.interface.js';
import { CustomerType, OrderStatus } from '../../../generated/prisma/enums.js';
import type {
  OrderCustomerResponse,
  OrderItemResponse,
  OrderResponse,
} from '../interfaces/order-response.interface.js';

export class OrderCustomerResponseDto implements OrderCustomerResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiProperty({
    description: 'CPF ou CNPJ sem pontuação.',
    example: '52998224725',
  })
  document: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Destino dos emails de pedido e status. Nulo apenas em clientes cadastrados antes do campo existir.',
    example: 'joao.silva@example.com',
  })
  email: string | null;

  @ApiProperty({
    enum: CustomerType,
    enumName: 'CustomerType',
    description: 'PERSON para CPF, COMPANY para CNPJ.',
    example: CustomerType.PERSON,
  })
  type: CustomerType;
}

export class OrderItemResponseDto implements OrderItemResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Caixa de som Bluetooth' })
  description: string;

  @ApiProperty({
    description: 'Decimal com duas casas, serializado como string.',
    example: '199.90',
  })
  price: string;
}

export class OrderResponseDto implements OrderResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PED-1001' })
  orderNumber: string;

  @ApiProperty({ format: 'date', example: '2026-11-15' })
  expectedDeliveryDate: string;

  @ApiProperty({ example: 'Rua das Flores, 123, Centro, São Paulo - SP' })
  deliveryAddress: string;

  @ApiProperty({
    enum: OrderStatus,
    enumName: 'OrderStatus',
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({ type: OrderCustomerResponseDto })
  customer: OrderCustomerResponseDto;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ format: 'uuid', description: 'Usuário que criou o pedido.' })
  createdById: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class OrderDataResponseDto implements ApiResponse<OrderResponse> {
  @ApiProperty({ type: OrderResponseDto })
  data: OrderResponseDto;

  @ApiPropertyOptional({
    type: [ApiWarningDto],
    description: 'Presente apenas quando houver aviso de negócio.',
  })
  warnings?: ApiWarningDto[];
}

export class OrderListResponseDto implements PaginatedResponse<OrderResponse> {
  @ApiProperty({
    type: [OrderResponseDto],
    description: 'Lista vazia quando nenhum pedido atende aos filtros.',
  })
  data: OrderResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
