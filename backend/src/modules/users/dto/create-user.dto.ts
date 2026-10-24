import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Trim,
  TrimLowerCase,
} from '../../../common/decorators/trim.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import type { UserRequest } from '../interfaces/user-request.interface.js';

export const USER_NAME_MAX_LENGTH = 150;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
// O Argon2 não trunca a senha; o limite evita custo excessivo com entradas
// enormes.
export const PASSWORD_MAX_LENGTH = 128;
// Política de senha: pelo menos uma letra e um número.
export const PASSWORD_POLICY_PATTERN = /^(?=.*\p{L})(?=.*\d)/u;

export class CreateUserDto implements UserRequest {
  @ApiProperty({ maxLength: USER_NAME_MAX_LENGTH, example: 'Maria Souza' })
  @Trim()
  @IsString({ message: 'name deve ser um texto' })
  @IsNotEmpty({ message: 'name é obrigatório' })
  @MaxLength(USER_NAME_MAX_LENGTH, {
    message: `name deve ter no máximo ${USER_NAME_MAX_LENGTH} caracteres`,
  })
  name: string;

  @ApiProperty({
    description:
      'Recebe o email de boas-vindas com a senha temporária. Armazenado sem espaços nas extremidades e em minúsculas.',
    maxLength: EMAIL_MAX_LENGTH,
    example: 'maria.souza@example.com',
  })
  @TrimLowerCase()
  @IsEmail({}, { message: 'email deve ser um email válido' })
  @MaxLength(EMAIL_MAX_LENGTH, {
    message: `email deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres`,
  })
  email: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  @IsEnum(Role, { message: 'role deve ser ADMIN ou USER' })
  role: Role;
}
