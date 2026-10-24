import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowPendingPasswordChange } from '../../common/decorators/allow-pending-password-change.decorator.js';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { UserDataResponseDto } from '../users/dto/user-response.dto.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDataResponseDto } from './dto/login-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica o usuário e retorna um access token JWT',
    description:
      'Rota pública. Use o accessToken retornado no header `Authorization: Bearer <token>` das rotas protegidas. Se `user.mustChangePassword` for true (primeiro acesso com a senha temporária), o frontend deve levar o usuário à troca de senha: até lá, só GET /auth/me e POST /auth/change-password são permitidos (as demais rotas retornam 403).',
  })
  @ApiOkResponse({
    description: 'Autenticado com sucesso.',
    type: LoginDataResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Email ou senha em formato inválido.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Credenciais inválidas ou usuário inativo (mesma resposta para todos os casos).',
    type: ErrorResponseDto,
  })
  async login(@Body() dto: LoginDto): Promise<LoginDataResponseDto> {
    return { data: await this.authService.login(dto) };
  }

  @Get('me')
  @Auth()
  @AllowPendingPasswordChange()
  @ApiOperation({
    summary: 'Retorna o usuário autenticado',
    description:
      'Permitido também no primeiro acesso. Use `mustChangePassword` para decidir se o usuário deve ir para a tela de troca de senha.',
  })
  @ApiOkResponse({
    description: 'Usuário autenticado.',
    type: UserDataResponseDto,
  })
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserDataResponseDto> {
    return { data: await this.authService.me(user.id) };
  }

  @Post('change-password')
  @Auth()
  @AllowPendingPasswordChange()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Troca a senha do usuário autenticado',
    description:
      'Obrigatória no primeiro acesso: informe a senha temporária recebida por email como `currentPassword` e a senha escolhida como `newPassword`. Depois da troca, `mustChangePassword` passa a false e todas as rotas ficam liberadas; o token atual continua válido. Também pode ser usada a qualquer momento para trocar a senha.',
  })
  @ApiOkResponse({
    description:
      'Senha alterada. Retorna o usuário com mustChangePassword false.',
    type: UserDataResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Senha atual incorreta, nova senha fora da política ou igual à atual.',
    type: ErrorResponseDto,
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<UserDataResponseDto> {
    return { data: await this.authService.changePassword(user.id, dto) };
  }
}
