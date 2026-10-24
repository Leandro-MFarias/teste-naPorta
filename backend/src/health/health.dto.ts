import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const HEALTH_STATUSES = ['Healthy', 'Unhealthy'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export class DatabaseHealthDto {
  @ApiProperty({ enum: HEALTH_STATUSES, example: 'Healthy' })
  status: HealthStatus;

  @ApiPropertyOptional({
    description:
      'Sessões de clientes abertas no PostgreSQL. Omitido quando o banco não responde.',
    example: 1,
  })
  openConnections?: number;

  @ApiPropertyOptional({
    description:
      'max_connections menos as conexões reservadas e as abertas. Omitido quando o banco não responde.',
    example: 96,
  })
  availableConnections?: number;

  @ApiPropertyOptional({
    description:
      'Limite de conexões do PostgreSQL (max_connections). Omitido quando o banco não responde.',
    example: 100,
  })
  maxConnections?: number;
}

export class HealthResponseDto {
  @ApiProperty({ enum: HEALTH_STATUSES, example: 'Healthy' })
  status: HealthStatus;

  @ApiProperty({ type: DatabaseHealthDto })
  database: DatabaseHealthDto;
}
