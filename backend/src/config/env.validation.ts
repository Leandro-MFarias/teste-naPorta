import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  registerDecorator,
  validateSync,
  type ValidationOptions,
} from 'class-validator';
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

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

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
