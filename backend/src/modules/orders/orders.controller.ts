import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Role } from '../../generated/prisma/enums.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import {
  OrderDataResponseDto,
  OrderListResponseDto,
} from './dto/order-response.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrdersService } from './orders.service.js';

const OrderIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('id deve ser um UUID válido'),
});

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth()
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
  @Auth()
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

  @Get(':id')
  @Auth()
  @ApiOperation({
    summary: 'Consulta um pedido ativo',
    description: 'ADMIN ou USER. Pedidos excluídos logicamente retornam 404.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Pedido encontrado.',
    type: OrderDataResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'id não é um UUID válido.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pedido inexistente ou excluído.',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', OrderIdPipe) id: string): Promise<OrderDataResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({
    summary: 'Edita um pedido ativo',
    description:
      'ADMIN ou USER. Edição parcial: campos omitidos permanecem inalterados. `items`, quando enviado, substitui todos os itens (lista vazia é rejeitada). `status` só aceita transições permitidas (PENDING → CONFIRMED/CANCELED, CONFIRMED → IN_PREPARATION/CANCELED, IN_PREPARATION → SHIPPED/CANCELED, SHIPPED → DELIVERED); reenviar o status atual não altera nada. `customer` reutiliza a regra de CPF/CNPJ da criação: com outro documento, o pedido passa para esse cliente; com o mesmo documento e outro nome, o nome é atualizado e a resposta inclui um aviso em `warnings`. Tudo acontece em uma única transação.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Pedido atualizado.',
    type: OrderDataResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos, id não UUID ou transição de status não permitida.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pedido inexistente ou excluído.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Já existe um pedido com este número.',
    type: ErrorResponseDto,
  })
  update(
    @Param('id', OrderIdPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderDataResponseDto> {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um pedido (exclusão lógica)',
    description:
      'Somente ADMIN. Marca o pedido como excluído (deletedAt), sem apagar o registro, e decrementa a contagem de pedidos do cliente. O pedido deixa de aparecer na listagem e na consulta, não pode mais ser editado e o número continua reservado.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Pedido excluído. Sem corpo.' })
  @ApiBadRequestResponse({
    description: 'id não é um UUID válido.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pedido inexistente ou já excluído.',
    type: ErrorResponseDto,
  })
  remove(@Param('id', OrderIdPipe) id: string): Promise<void> {
    return this.ordersService.remove(id);
  }
}
