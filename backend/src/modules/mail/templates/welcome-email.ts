import type { EmailMessage } from '../email-sender.js';
import {
  BRAND_NAME,
  renderEmailLayout,
  renderEmailText,
  type EmailLayoutData,
} from './email-layout.js';

export interface WelcomeEmailData {
  name: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): EmailMessage {
  const layout: EmailLayoutData = {
    title: `Bem-vindo(a) à ${BRAND_NAME} — acesso criado`,
    greeting: `${data.name},`,
    intro:
      'Uma conta foi criada para você. Use a senha temporária abaixo para fazer o seu primeiro acesso:',
    highlight: { label: 'Senha temporária', value: data.temporaryPassword },
    sections: [
      {
        heading: 'Como acessar?',
        paragraphs: [
          `Clique no botão abaixo e entre com o seu email (${data.email}) e a senha temporária.`,
        ],
        button: { label: 'Acessar o sistema', url: data.loginUrl },
      },
      {
        heading: 'Primeiro login',
        paragraphs: [
          'No primeiro login, você precisará trocar essa senha por uma de sua escolha. Não a compartilhe com ninguém.',
        ],
      },
    ],
  };

  return {
    to: data.email,
    subject: layout.title,
    html: renderEmailLayout(layout),
    text: renderEmailText(layout),
  };
}
