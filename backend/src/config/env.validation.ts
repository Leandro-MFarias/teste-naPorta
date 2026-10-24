import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  registerDecorator,
  validateSync,
  type ValidationOptions,
} from 'class-validator';
import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from './cors.js';
import { parseDurationToSeconds } from './duration.js';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export const MIN_JWT_EXPIRES_IN_SECONDS = 5 * 60 * 60;
export const MIN_JWT_SECRET_LENGTH = 32;

function IsDurationAtLeast(
  minSeconds: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isDurationAtLeast',
      target: target.constructor,
      propertyName: String(propertyName),
      constraints: [minSeconds],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const seconds = parseDurationToSeconds(value);
          return seconds !== null && seconds >= minSeconds;
        },
      },
    });
  };
}

function IsCorsOriginList(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isCorsOriginList',
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && parseCorsOrigins(value) !== null;
        },
      },
    });
  };
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3333;

  @IsString()
  @Matches(/^postgres(ql)?:\/\/.+/, {
    message: 'DATABASE_URL must be a postgresql:// connection URL',
  })
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(MIN_JWT_SECRET_LENGTH)
  JWT_SECRET: string;

  @IsString()
  @IsDurationAtLeast(MIN_JWT_EXPIRES_IN_SECONDS, {
    message:
      'JWT_EXPIRES_IN must use the format <number><s|m|h|d> and be at least 5h',
  })
  JWT_EXPIRES_IN: string = '5h';

  /** Origens liberadas no CORS, separadas por vírgula. */
  @IsCorsOriginList({
    message:
      'CORS_ORIGINS must be a comma-separated list of http(s) origins, e.g. http://localhost:3000',
  })
  CORS_ORIGINS: string = DEFAULT_CORS_ORIGINS;

  /** URL do frontend, usada nos links dos emails (ex.: botão de login). */
  @IsUrl(
    {
      require_tld: false,
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'FRONTEND_URL must be an http(s) URL' },
  )
  FRONTEND_URL: string = 'http://localhost:3000';

  // SMTP. Os padrões apontam para o Mailpit local do compose.yaml.
  @IsString()
  @IsNotEmpty()
  SMTP_HOST: string = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  /** true para TLS direto (porta 465); false usa STARTTLS quando disponível. */
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'SMTP_SECURE must be true or false' })
  SMTP_SECURE: boolean = false;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  /** Remetente, ex.: "naPorta <no-reply@naporta.com.br>". */
  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'naPorta <no-reply@naporta.local>';
}

/**
 * Valida as variáveis de ambiente na inicialização. Usada pelo
 * `ConfigModule`; lança erro (impedindo a aplicação de subir) se algo
 * estiver inválido. As mensagens citam apenas o nome da variável, nunca o
 * valor, para não vazar segredos em logs.
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(
      `Invalid environment variables:\n- ${messages.join('\n- ')}`,
    );
  }

  return validated;
}
