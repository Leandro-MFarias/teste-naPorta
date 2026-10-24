import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDataResponseDto } from './dto/login-response.dto.js';
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
      'Rota pública. Use o accessToken retornado no header `Authorization: Bearer <token>` das rotas protegidas.',
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
}
