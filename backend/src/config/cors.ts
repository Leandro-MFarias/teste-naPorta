import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/** Frontend Next.js local. Outras origens entram em CORS_ORIGINS. */
export const DEFAULT_CORS_ORIGINS = 'http://localhost:3000';

/**
 * Converte CORS_ORIGINS ("http://a.com, https://b.com") em lista de
 * origens. Cada item precisa ser uma origem http(s) exata, sem caminho;
 * uma barra final é tolerada. Retorna null se algum item for inválido.
 */
export function parseCorsOrigins(value: string): string[] | null {
  const items = value
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (items.length === 0) {
    return null;
  }

  for (const item of items) {
    let url: URL;
    try {
      url = new URL(item);
    } catch {
      return null;
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== item) {
      return null;
    }
  }
  return [...new Set(items)];
}

/**
 * Libera apenas as origens configuradas. O token vai no header
 * Authorization (sem cookies), então `credentials` não é necessário.
 */
export function createCorsOptions(origins: string[]): CorsOptions {
  return {
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}
