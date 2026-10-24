import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './common/dto/error-response.dto.js';

export const SWAGGER_PATH = 'api/docs';

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('naPorta API')
    .setDescription('API REST para gestão de pedidos de entrega.')
    .setVersion('0.0.1')
    // Esquema usado pelas rotas protegidas com @ApiBearerAuth().
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  return SwaggerModule.createDocument(app, config, {
    // Formato de erro comum a todas as rotas (seção 14.2).
    extraModels: [ErrorResponseDto],
  });
}

/**
 * Publica a interface do Swagger em /api/docs e o JSON da especificação
 * OpenAPI em /api/docs-json.
 */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, () => createSwaggerDocument(app), {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    swaggerOptions: { persistAuthorization: true },
  });
}
