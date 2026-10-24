export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Alternativa em texto puro ao HTML. */
  text: string;
}

/**
 * Transporte de email. Também é o token de injeção: a implementação padrão
 * é SMTP (SmtpEmailSender) e os testes a substituem por uma fake.
 */
export abstract class EmailSender {
  /** Rejeita se o envio falhar. */
  abstract send(message: EmailMessage): Promise<void>;
}
