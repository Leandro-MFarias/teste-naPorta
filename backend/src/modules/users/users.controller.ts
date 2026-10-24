import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Role } from '../../generated/prisma/enums.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserDataResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Cadastra um usuário',
    description:
      'Exclusivo para ADMIN; não existe cadastro público. Não se informa senha: o sistema gera uma senha temporária aleatória, envia ao email do usuário (email de boas-vindas com o botão de acesso) e guarda apenas o hash. O usuário é criado ativo, com `mustChangePassword: true`, e precisa trocar a senha no primeiro login (POST /auth/change-password). Se o email não puder ser enviado, nada é cadastrado (503).',
  })
  @ApiCreatedResponse({
    description: 'Usuário criado.',
    type: UserDataResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos (ex.: email, papel).',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Já existe um usuário com este email.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'Falha ao enviar o email de boas-vindas; o usuário não foi cadastrado.',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateUserDto): Promise<UserDataResponseDto> {
    return { data: await this.usersService.create(dto) };
  }
}
