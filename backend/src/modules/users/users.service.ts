import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { generateTemporaryPassword } from '../auth/temporary-password.js';
import { MailService } from '../mail/mail.service.js';
import type { UserRequest } from './interfaces/user-request.interface.js';
import type { UserResponse } from './interfaces/user-response.interface.js';
import { toUserResponse } from './user.mapper.js';

export const EMAIL_IN_USE_MESSAGE = 'Já existe um usuário com este email.';
export const WELCOME_EMAIL_FAILED_MESSAGE =
  'Não foi possível enviar o email de boas-vindas. O usuário não foi cadastrado; tente novamente.';

/** Sinaliza a falha de envio para desfazer a transação do cadastro. */
class WelcomeEmailError extends Error {}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
  ) {}

  /**
   * Cria um usuário ativo com uma senha temporária aleatória, que só existe
   * no email de boas-vindas (nunca na resposta nem em log). O usuário fica
   * com mustChangePassword = true até trocá-la no primeiro acesso.
   *
   * O email é enviado dentro da transação: se o envio falhar, o cadastro é
   * desfeito e a API retorna 503, para não existir um usuário que ninguém
   * consegue acessar. O email chega normalizado pelo DTO; a unicidade é
   * garantida pelo índice do banco, inclusive sob concorrência.
   */
  async create({ name, email, role }: UserRequest): Promise<UserResponse> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.passwords.hash(temporaryPassword);

    try {
      const user = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.user.create({
            data: { name, email, passwordHash, role, mustChangePassword: true },
          });
          try {
            await this.mail.sendWelcome({ name, email, temporaryPassword });
          } catch (error) {
            throw new WelcomeEmailError(
              error instanceof Error ? error.message : String(error),
            );
          }
          return created;
        },
        // O envio por SMTP pode levar alguns segundos.
        { timeout: 30_000 },
      );
      return toUserResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(EMAIL_IN_USE_MESSAGE);
      }
      if (error instanceof WelcomeEmailError) {
        // Sem destinatário nem senha no log.
        this.logger.error(`Falha no email de boas-vindas: ${error.message}`);
        throw new ServiceUnavailableException(WELCOME_EMAIL_FAILED_MESSAGE);
      }
      throw error;
    }
  }
}
