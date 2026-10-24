import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { HealthResponseDto } from './health.dto.js';
import { HealthService } from './health.service.js';

/**
 * Rota pública de verificação de saúde, usada por monitoramento e
 * healthchecks de container. Responde 200 quando saudável e 503 quando
 * alguma dependência (o banco) estiver indisponível.
 */
@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verifica a saúde da API e do banco de dados',
    description:
      'Rota pública. Retorna o status e as conexões abertas, disponíveis e máximas do PostgreSQL.',
  })
  @ApiOkResponse({
    description: 'API e banco de dados saudáveis.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Banco de dados indisponível.',
    type: HealthResponseDto,
    example: { status: 'Unhealthy', database: { status: 'Unhealthy' } },
  })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const health = await this.healthService.check();
    if (health.status !== 'Healthy') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
