import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DatabaseHealthDto, HealthResponseDto } from './health.dto.js';

interface ConnectionStatsRow {
  openConnections: number;
  maxConnections: number;
  reservedConnections: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    const database = await this.checkDatabase();
    return { status: database.status, database };
  }

  private async checkDatabase(): Promise<DatabaseHealthDto> {
    try {
      // Conexões abertas: sessões de clientes (exclui processos internos do
      // Postgres). Reservadas: superuser_reserved_connections e, a partir do
      // PostgreSQL 16, reserved_connections; não ficam disponíveis à aplicação.
      const [stats] = await this.prisma.$queryRaw<ConnectionStatsRow[]>`
        SELECT
          (SELECT count(*)::int
             FROM pg_stat_activity
            WHERE backend_type = 'client backend') AS "openConnections",
          current_setting('max_connections')::int AS "maxConnections",
          current_setting('superuser_reserved_connections')::int
            + COALESCE(current_setting('reserved_connections', true), '0')::int
            AS "reservedConnections"
      `;

      return {
        status: 'Healthy',
        openConnections: stats.openConnections,
        availableConnections: Math.max(
          stats.maxConnections -
            stats.reservedConnections -
            stats.openConnections,
          0,
        ),
        maxConnections: stats.maxConnections,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${describe(error)}`);
      return { status: 'Unhealthy' };
    }
  }
}

// Erros do Prisma trazem um cabeçalho multilinha ("Invalid `prisma...`");
// a causa fica na última linha.
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().split('\n').at(-1) ?? message;
}
