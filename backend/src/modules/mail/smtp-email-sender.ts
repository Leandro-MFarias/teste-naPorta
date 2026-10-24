import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { EmailSender, type EmailMessage } from './email-sender.js';

/** Envio por SMTP (Nodemailer). Em desenvolvimento, aponta para o Mailpit. */
@Injectable()
export class SmtpEmailSender extends EmailSender implements OnModuleDestroy {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super();
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASSWORD', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: user ? { user, pass } : undefined,
      // Sem timeouts, um servidor SMTP fora do ar prenderia a requisição.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
