import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { OrderStatus } from '../../generated/prisma/enums.js';
import type { OrderResponse } from '../orders/interfaces/order-response.interface.js';
import { EmailSender, type EmailMessage } from './email-sender.js';
import {
  buildOrderCreatedEmail,
  buildOrderStatusEmail,
  type OrderCreatedReason,
} from './templates/order-emails.js';
import { buildWelcomeEmail } from './templates/welcome-email.js';

/** Rota do frontend com a tela de login (botão do email de boas-vindas). */
export const LOGIN_PATH = '/login';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly loginUrl: string;

  constructor(
    private readonly sender: EmailSender,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.loginUrl = new URL(
      LOGIN_PATH,
      config.get('FRONTEND_URL', { infer: true }),
    ).toString();
  }

  /**
   * Boas-vindas com a senha temporária. Rejeita se o envio falhar: quem
   * chama decide o que fazer (o cadastro de usuário é desfeito).
   */
  sendWelcome(data: {
    name: string;
    email: string;
    temporaryPassword: string;
  }): Promise<void> {
    return this.sender.send(
      buildWelcomeEmail({ ...data, loginUrl: this.loginUrl }),
    );
  }

  /**
   * Avisa o cliente de que um pedido passou a ser dele. Nunca rejeita:
   * falha de email não desfaz o pedido, apenas é registrada no log.
   */
  notifyOrderCreated(
    order: OrderResponse,
    reason: OrderCreatedReason,
  ): Promise<void> {
    if (!order.customer.email) {
      return Promise.resolve();
    }
    return this.dispatch(
      buildOrderCreatedEmail(order, order.customer.email, reason),
      order.orderNumber,
    );
  }

  /** Avisa o cliente da mudança de status. Nunca rejeita (ver acima). */
  notifyOrderStatusChanged(
    order: OrderResponse,
    previousStatus: OrderStatus,
  ): Promise<void> {
    if (!order.customer.email) {
      return Promise.resolve();
    }
    return this.dispatch(
      buildOrderStatusEmail(order, order.customer.email, previousStatus),
      order.orderNumber,
    );
  }

  private async dispatch(
    message: EmailMessage,
    orderNumber: string,
  ): Promise<void> {
    try {
      await this.sender.send(message);
    } catch (error) {
      // Sem destinatário nem conteúdo no log: só o pedido e o motivo.
      this.logger.error(
        `Falha ao enviar email do pedido ${orderNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
