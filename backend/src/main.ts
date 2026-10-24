import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import type { EnvironmentVariables } from './config/env.validation.js';
import { setupSwagger, SWAGGER_PATH } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.useGlobalPipes(createValidationPipe());
  setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Swagger disponível em http://localhost:${port}/${SWAGGER_PATH}`,
  );
}
void bootstrap();
