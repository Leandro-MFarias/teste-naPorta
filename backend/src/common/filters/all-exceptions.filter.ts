import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import type { ApiErrorResponse } from '../interfaces/api-response.interface.js';

const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor.';

/**
 * Converte qualquer exceção no formato de erro da seção 14.2. Erros
 * inesperados viram 500 sem stack trace, SQL ou detalhes internos na
 * resposta; o detalhe fica apenas no log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.path} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      statusCode,
      message,
      error: HttpStatus[statusCode] ?? 'INTERNAL_SERVER_ERROR',
    };
    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        message: httpExceptionMessage(exception),
      };
    }

    // Rede de segurança: services devem tratar esses casos com mensagens
    // específicas. Aqui só evitamos que virem 500.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'Já existe um registro com estes dados.',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Registro não encontrado.',
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}

/**
 * Extrai a mensagem de uma HttpException: o texto passado ao construtor ou
 * a lista de erros do ValidationPipe.
 */
function httpExceptionMessage(exception: HttpException): string | string[] {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  const { message } = response as { message?: unknown };
  if (
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((m) => typeof m === 'string'))
  ) {
    return message;
  }
  return exception.message;
}
