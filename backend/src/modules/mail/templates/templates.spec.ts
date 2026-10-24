import { describe, expect, it } from 'vitest';
import type { OrderResponse } from '../../orders/interfaces/order-response.interface.js';
import {
  escapeHtml,
  renderEmailLayout,
  renderEmailText,
} from './email-layout.js';
import {
  buildOrderCreatedEmail,
  buildOrderStatusEmail,
} from './order-emails.js';
import { buildWelcomeEmail } from './welcome-email.js';

const order: OrderResponse = {
  id: 'o1',
  orderNumber: 'PED-1001',
  expectedDeliveryDate: '2026-11-15',
  deliveryAddress: 'Rua das Flores, 123',
  status: 'SHIPPED',
  customer: {
    id: 'c1',
    name: 'João <da> Silva',
    document: '52998224725',
    email: 'joao@example.com',
    type: 'PERSON',
  },
  items: [
    { id: 'i1', description: 'Caixa de som', price: '199.90' },
    { id: 'i2', description: 'Cabo', price: '0.10' },
  ],
  createdById: 'u1',
  createdAt: new Date('2026-10-24T12:00:00.000Z'),
  updatedAt: new Date('2026-10-24T12:00:00.000Z'),
};

describe('layout de email', () => {
  it('escapa HTML', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('monta marca, saudação, destaque, seções, linhas, botão e assinatura', () => {
    const data = {
      title: 'Título',
      greeting: 'Maria,',
      intro: 'Introdução',
      highlight: { label: 'Código', value: 'ABC123' },
      sections: [
        {
          heading: 'Seção',
          paragraphs: ['Parágrafo'],
          rows: [{ label: 'Total', value: 'R$ 1,00', strong: true }],
          button: {
            label: 'Abrir',
            url: 'https://app.example.com/login?a=1&b=2',
          },
        },
      ],
    };

    const html = renderEmailLayout(data);
    expect(html).toContain('>naPorta<');
    expect(html).toContain('Maria,');
    expect(html).toContain('ABC123');
    expect(html).toContain('href="https://app.example.com/login?a=1&amp;b=2"');
    expect(html).toContain('A equipe naPorta');
    expect(html).not.toContain('LogsUp');

    expect(renderEmailText(data)).toBe(
      [
        'Maria,',
        '',
        'Introdução',
        '',
        'Código: ABC123',
        '',
        'SEÇÃO',
        '',
        'Parágrafo',
        '',
        'Total: R$ 1,00',
        '',
        'Abrir: https://app.example.com/login?a=1&b=2',
        '',
        'Atenciosamente,',
        'A equipe naPorta',
      ].join('\n'),
    );
  });
});

describe('email de boas-vindas', () => {
  it('leva a senha temporária, o email e o botão de login', () => {
    const message = buildWelcomeEmail({
      name: 'Maria',
      email: 'maria@example.com',
      temporaryPassword: 'Tmp7hQk2xZp9mWv4',
      loginUrl: 'http://localhost:3000/login',
    });

    expect(message.to).toBe('maria@example.com');
    expect(message.subject).toBe('Bem-vindo(a) à naPorta — acesso criado');
    expect(message.html).toContain('Tmp7hQk2xZp9mWv4');
    expect(message.html).toContain('href="http://localhost:3000/login"');
    expect(message.text).toContain('Senha temporária: Tmp7hQk2xZp9mWv4');
    expect(message.text).toContain('PRIMEIRO LOGIN');
  });
});

describe('emails de pedido', () => {
  it('pedido recebido: dados do pedido, itens, total e status', () => {
    const message = buildOrderCreatedEmail(
      order,
      'joao@example.com',
      'NEW_CUSTOMER',
    );

    expect(message.subject).toBe('Pedido PED-1001 recebido');
    expect(message.text).toContain('Seu cadastro foi criado');
    expect(message.text).toContain('Status: Enviado');
    expect(message.text).toContain('Previsão de entrega: 15/11/2026');
    expect(message.text).toContain('Endereço de entrega: Rua das Flores, 123');
    expect(message.text).toMatch(/Caixa de som: R\$\s199,90/);
    expect(message.text).toMatch(/Cabo: R\$\s0,10/);
    expect(message.text).toMatch(/Total: R\$\s200,00/);
    // Nome do cliente é escapado no HTML.
    expect(message.html).toContain('João &lt;da&gt; Silva,');
  });

  it.each([
    ['NEW_ORDER', 'Recebemos um novo pedido para você'],
    ['ASSIGNED', 'foi vinculado ao seu cadastro'],
  ] as const)('intro para %s', (reason, text) => {
    expect(
      buildOrderCreatedEmail(order, 'joao@example.com', reason).text,
    ).toContain(text);
  });

  it('atualização de status: status anterior e novo', () => {
    const message = buildOrderStatusEmail(
      order,
      'joao@example.com',
      'IN_PREPARATION',
    );

    expect(message.subject).toBe('Pedido PED-1001: Enviado');
    expect(message.text).toContain(
      'O status do seu pedido PED-1001 mudou de "Em preparação" para "Enviado".',
    );
    expect(message.text).toContain('Novo status: Enviado');
  });
});
