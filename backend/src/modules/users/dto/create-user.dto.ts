import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
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
// O bcrypt considera apenas os primeiros 72 bytes da senha.
export const PASSWORD_MAX_LENGTH = 72;

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
    description: 'Armazenado sem espaços nas extremidades e em minúsculas.',
    maxLength: EMAIL_MAX_LENGTH,
    example: 'maria.souza@example.com',
  })
  @TrimLowerCase()
  @IsEmail({}, { message: 'email deve ser um email válido' })
  @MaxLength(EMAIL_MAX_LENGTH, {
    message: `email deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres`,
  })
  email: string;

  @ApiProperty({
    description: `Política mínima: de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres, com pelo menos uma letra e um número.`,
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    format: 'password',
    example: 'SenhaForte123',
  })
  @IsString({ message: 'password deve ser um texto' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `password deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `password deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  })
  @Matches(/^(?=.*\p{L})(?=.*\d)/u, {
    message: 'password deve conter pelo menos uma letra e um número',
  })
  password: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  @IsEnum(Role, { message: 'role deve ser ADMIN ou USER' })
  role: Role;
}
