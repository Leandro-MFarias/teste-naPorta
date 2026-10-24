import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import type {
  CreateOrderRequest,
  CustomerRequest,
  OrderItemRequest,
} from '../interfaces/order-request.interface.js';

export const CUSTOMER_NAME_MAX_LENGTH = 150;
// CNPJ formatado (00.000.000/0000-00) tem 18 caracteres.
export const DOCUMENT_INPUT_MAX_LENGTH = 18;
export const ORDER_NUMBER_MAX_LENGTH = 50;
export const DELIVERY_ADDRESS_MAX_LENGTH = 500;
export const ITEM_DESCRIPTION_MAX_LENGTH = 255;
export const MAX_ITEMS_PER_ORDER = 100;
// Limite de Decimal(12, 2).
export const MAX_ITEM_PRICE = 9_999_999_999.99;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CustomerDto implements CustomerRequest {
  @ApiProperty({
    maxLength: CUSTOMER_NAME_MAX_LENGTH,
    example: 'João da Silva',
  })
  @Trim()
  @IsString({ message: 'name deve ser um texto' })
  @IsNotEmpty({ message: 'name é obrigatório' })
  @MaxLength(CUSTOMER_NAME_MAX_LENGTH, {
    message: `name deve ter no máximo ${CUSTOMER_NAME_MAX_LENGTH} caracteres`,
  })
  name: string;

  @ApiProperty({
    description:
      'CPF (pessoa física) ou CNPJ (pessoa jurídica, inclusive alfanumérico), com ou sem pontuação, ex.: 529.982.247-25 ou 11.222.333/0001-81. O tipo do cliente (PERSON/COMPANY) é definido a partir dele.',
    maxLength: DOCUMENT_INPUT_MAX_LENGTH,
    example: '529.982.247-25',
  })
  @Trim()
  @IsString({ message: 'document deve ser um texto' })
  @IsNotEmpty({ message: 'document é obrigatório' })
  @MaxLength(DOCUMENT_INPUT_MAX_LENGTH, {
    message: `document deve ter no máximo ${DOCUMENT_INPUT_MAX_LENGTH} caracteres`,
  })
  // Formato básico; dígitos verificadores são validados na regra de cliente.
  @Matches(/^[0-9A-Za-z./\-\s]+$/, {
    message:
      'document deve conter apenas letras, números e pontuação de CPF/CNPJ',
  })
  document: string;
}

export class OrderItemDto implements OrderItemRequest {
  @ApiProperty({
    maxLength: ITEM_DESCRIPTION_MAX_LENGTH,
    example: 'Caixa de som Bluetooth',
  })
  @Trim()
  @IsString({ message: 'description deve ser um texto' })
  @IsNotEmpty({ message: 'description é obrigatório' })
  @MaxLength(ITEM_DESCRIPTION_MAX_LENGTH, {
    message: `description deve ter no máximo ${ITEM_DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  description: string;

  @ApiProperty({
    description: 'Valor não negativo com até duas casas decimais.',
    minimum: 0,
    maximum: MAX_ITEM_PRICE,
    example: 199.9,
  })
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'price deve ser um número com até duas casas decimais' },
  )
  @Min(0, { message: 'price não pode ser negativo' })
  @Max(MAX_ITEM_PRICE, {
    message: `price deve ser no máximo ${MAX_ITEM_PRICE}`,
  })
  price: number;
}

export class CreateOrderDto implements CreateOrderRequest {
  @ApiProperty({ maxLength: ORDER_NUMBER_MAX_LENGTH, example: 'PED-1001' })
  @Trim()
  @IsString({ message: 'orderNumber deve ser um texto' })
  @IsNotEmpty({ message: 'orderNumber é obrigatório' })
  @MaxLength(ORDER_NUMBER_MAX_LENGTH, {
    message: `orderNumber deve ter no máximo ${ORDER_NUMBER_MAX_LENGTH} caracteres`,
  })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, {
    message:
      'orderNumber deve começar com letra ou número e conter apenas letras, números, ".", "_", "/" ou "-"',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Previsão de entrega no formato YYYY-MM-DD.',
    format: 'date',
    example: '2026-11-15',
  })
  @Matches(DATE_ONLY, {
    message: 'expectedDeliveryDate deve estar no formato YYYY-MM-DD',
  })
  @IsISO8601(
    { strict: true },
    { message: 'expectedDeliveryDate deve ser uma data válida' },
  )
  expectedDeliveryDate: string;

  @ApiProperty({
    maxLength: DELIVERY_ADDRESS_MAX_LENGTH,
    example: 'Rua das Flores, 123, Centro, São Paulo - SP, 01000-000',
  })
  @Trim()
  @IsString({ message: 'deliveryAddress deve ser um texto' })
  @IsNotEmpty({ message: 'deliveryAddress é obrigatório' })
  @MaxLength(DELIVERY_ADDRESS_MAX_LENGTH, {
    message: `deliveryAddress deve ter no máximo ${DELIVERY_ADDRESS_MAX_LENGTH} caracteres`,
  })
  deliveryAddress: string;

  @ApiProperty({ type: CustomerDto })
  @IsObject({ message: 'customer deve ser um objeto' })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    type: [OrderItemDto],
    minItems: 1,
    maxItems: MAX_ITEMS_PER_ORDER,
  })
  @IsArray({ message: 'items deve ser uma lista' })
  @ArrayMinSize(1, { message: 'items deve ter pelo menos um item' })
  @ArrayMaxSize(MAX_ITEMS_PER_ORDER, {
    message: `items deve ter no máximo ${MAX_ITEMS_PER_ORDER} itens`,
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
