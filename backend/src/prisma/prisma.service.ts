import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Ponto único de acesso ao banco. Injetado nos services que precisam
 * consultar ou alterar dados.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        // Sem timeout o pg espera indefinidamente quando o banco está fora.
        connectionTimeoutMillis: 5_000,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    // Com driver adapter o $connect() não abre conexão de fato; a consulta
    // garante que a aplicação falhe na inicialização se o banco estiver fora.
    await this.$connect();
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
