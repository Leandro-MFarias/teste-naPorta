import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimLowerCase } from '../../../common/decorators/trim.decorator.js';
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../../users/dto/create-user.dto.js';
import type { LoginRequest } from '../interfaces/login.interface.js';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'maria.souza@example.com' })
  @TrimLowerCase()
  @IsEmail({}, { message: 'email deve ser um email válido' })
  @MaxLength(EMAIL_MAX_LENGTH, {
    message: `email deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres`,
  })
  email: string;

  // Sem política de senha aqui: o login só compara com o hash armazenado.
  @ApiProperty({ format: 'password', example: 'SenhaForte123' })
  @IsString({ message: 'password deve ser um texto' })
  @IsNotEmpty({ message: 'password é obrigatório' })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `password deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  })
  password: string;
}
