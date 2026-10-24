import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_PATTERN,
} from '../../users/dto/create-user.dto.js';
import type { ChangePasswordRequest } from '../interfaces/change-password.interface.js';

export class ChangePasswordDto implements ChangePasswordRequest {
  @ApiProperty({
    description:
      'Senha atual. No primeiro acesso, é a senha temporária recebida por email.',
    format: 'password',
    example: 'Tmp7hQk2xZp9mWv4',
  })
  @IsString({ message: 'currentPassword deve ser um texto' })
  @IsNotEmpty({ message: 'currentPassword é obrigatório' })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `currentPassword deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  })
  currentPassword: string;

  @ApiProperty({
    description: `Nova senha escolhida pelo usuário: de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres, com pelo menos uma letra e um número, diferente da atual.`,
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    format: 'password',
    example: 'MinhaSenha123',
  })
  @IsString({ message: 'newPassword deve ser um texto' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `newPassword deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `newPassword deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  })
  @Matches(PASSWORD_POLICY_PATTERN, {
    message: 'newPassword deve conter pelo menos uma letra e um número',
  })
  newPassword: string;
}
