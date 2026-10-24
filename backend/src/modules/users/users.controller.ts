import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
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
      'Exclusivo para ADMIN; não existe cadastro público. O usuário é criado ativo e a senha é armazenada apenas como hash.',
  })
  @ApiCreatedResponse({
    description: 'Usuário criado.',
    type: UserDataResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos (ex.: email, senha fora da política, papel).',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Já existe um usuário com este email.',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateUserDto): Promise<UserDataResponseDto> {
    return { data: await this.usersService.create(dto) };
  }
}
