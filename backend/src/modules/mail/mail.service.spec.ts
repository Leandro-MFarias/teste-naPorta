import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderResponse } from '../orders/interfaces/order-response.interface.js';
import { EmailSender, type EmailMessage } from './email-sender.js';
import { MailService } from './mail.service.js';

const order: OrderResponse = {
  id: 'o1',
  orderNumber: 'PED-1001',
  expectedDeliveryDate: '2026-11-15',
  deliveryAddress: 'Rua',
  status: 'CONFIRMED',
  customer: {
    id: 'c1',
    name: 'João',
    document: '52998224725',
    email: 'joao@example.com',
    type: 'PERSON',
  },
  items: [{ id: 'i1', description: 'Cabo', price: '10.00' }],
  createdById: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MailService', () => {
  const send = vi.fn<(message: EmailMessage) => Promise<void>>();
  let service: MailService;

  beforeEach(async () => {
    send.mockReset().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: EmailSender, useValue: { send } },
        {
          provide: ConfigService,
          useValue: { get: () => 'https://portal.example.com/app/' },
        },
      ],
    }).compile();
    service = moduleRef.get(MailService);
  });

  it('boas-vindas: botão aponta para /login do frontend', async () => {
    await service.sendWelcome({
      name: 'Maria',
      email: 'maria@example.com',
      temporaryPassword: 'Tmp7hQk2xZp9mWv4',
    });

    expect(send.mock.calls[0][0]).toMatchObject({ to: 'maria@example.com' });
    expect(send.mock.calls[0][0].text).toContain(
      'Acessar o sistema: https://portal.example.com/login',
    );
  });

  it('boas-vindas: propaga a falha de envio', async () => {
    send.mockRejectedValue(new Error('SMTP fora'));

    await expect(
      service.sendWelcome({
        name: 'Maria',
        email: 'maria@example.com',
        temporaryPassword: 'x',
      }),
    ).rejects.toThrow('SMTP fora');
  });

  it('pedido e status: enviam ao email do cliente', async () => {
    await service.notifyOrderCreated(order, 'NEW_ORDER');
    await service.notifyOrderStatusChanged(order, 'PENDING');

    expect(send.mock.calls.map(([m]) => [m.to, m.subject])).toEqual([
      ['joao@example.com', 'Pedido PED-1001 recebido'],
      ['joao@example.com', 'Pedido PED-1001: Confirmado'],
    ]);
  });

  it('pedido e status: não enviam se o cliente não tem email', async () => {
    const legacy = { ...order, customer: { ...order.customer, email: null } };

    await service.notifyOrderCreated(legacy, 'NEW_ORDER');
    await service.notifyOrderStatusChanged(legacy, 'PENDING');

    expect(send).not.toHaveBeenCalled();
  });

  it('pedido e status: falha de envio é registrada no log, sem rejeitar e sem o destinatário', async () => {
    send.mockRejectedValue(new Error('SMTP fora'));
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    await expect(
      service.notifyOrderCreated(order, 'NEW_ORDER'),
    ).resolves.toBeUndefined();
    await expect(
      service.notifyOrderStatusChanged(order, 'PENDING'),
    ).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toBe(
      'Falha ao enviar email do pedido PED-1001: SMTP fora',
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('joao@example.com');
    log.mockRestore();
  });
});
