import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import {
  OrderDataResponseDto,
  OrderListResponseDto,
} from './dto/order-response.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Orders')
@Auth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um pedido',
    description:
      'ADMIN ou USER. O status inicial é PENDING e o criador é o usuário autenticado. O cliente é criado ou reutilizado pelo CPF/CNPJ; se já existir com outro nome, o nome é atualizado e a resposta inclui um aviso em `warnings`.',
  })
  @ApiCreatedResponse({
    description: 'Pedido criado.',
    type: OrderDataResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos (ex.: CPF/CNPJ inválido, lista de itens vazia).',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Já existe um pedido com este número.',
    type: ErrorResponseDto,
  })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDataResponseDto> {
    return this.ordersService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista pedidos ativos',
    description:
      'ADMIN ou USER. Filtros combináveis; pedidos excluídos nunca aparecem. O período usa a data de criação (createdAt). Ordenação: mais recentes primeiro. Sem resultados (ou página além do total), retorna 200 com `data: []` e o `meta` correspondente.',
  })
  @ApiOkResponse({
    description: 'Página de pedidos.',
    type: OrderListResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Query inválida (ex.: page/limit fora dos limites, data inválida, endDate anterior a startDate).',
    type: ErrorResponseDto,
  })
  findAll(@Query() query: ListOrdersQueryDto): Promise<OrderListResponseDto> {
    return this.ordersService.findAll(query);
  }
}
