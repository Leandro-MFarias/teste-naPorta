import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { ARGON2_OPTIONS } from '../src/modules/auth/password.service.js';
import { parseDocument } from '../src/modules/customers/document.js';
import { buildSeedOrders, SEED_CUSTOMERS, SEED_USERS } from './seed/data.js';

/**
 * Seed idempotente com dados fictícios (seção 18.3). Executar com
 * `npm run prisma:seed`. Reexecutar não duplica nada:
 * - usuários: upsert por email; a senha só é definida na criação e não é
 *   temporária (mustChangePassword = false), para as credenciais de
 *   demonstração funcionarem direto;
 * - clientes: inseridos se o documento ainda não existir; um cliente do
 *   seed sem email (criado antes do campo existir) recebe o email do seed;
 * - nenhum email é enviado;
 * - pedidos: criados apenas se o número ainda não existir (inclusive
 *   excluídos logicamente, cujo número continua reservado). ordersCount é
 *   incrementado só para pedidos criados nesta execução.
 */

// Mesma ordem da aplicação: .env.<NODE_ENV> e depois .env.
config({
  path: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
  quiet: true,
});

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed de demonstração não pode rodar em produção.');
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // Hash fora da transação: Argon2 é lento de propósito.
    const users = await Promise.all(
      SEED_USERS.map(async ({ password, ...user }) => ({
        ...user,
        passwordHash: await argon2.hash(password, ARGON2_OPTIONS),
      })),
    );

    const summary = await prisma.$transaction(
      async (tx) => {
        const userIds = new Map<string, string>();
        for (const { passwordHash, ...user } of users) {
          const saved = await tx.user.upsert({
            where: { email: user.email },
            create: { ...user, passwordHash, mustChangePassword: false },
            update: { name: user.name, role: user.role, isActive: true },
          });
          userIds.set(saved.email, saved.id);
        }

        const customerData = SEED_CUSTOMERS.map(({ name, document, email }) => {
          const parsed = parseDocument(document);
          if (!parsed) {
            throw new Error(`Documento inválido no seed: ${document}`);
          }
          return { name, document: parsed.value, type: parsed.type, email };
        });
        const { count: customersCreated } = await tx.customer.createMany({
          data: customerData,
          skipDuplicates: true,
        });
        for (const { document, email } of customerData) {
          await tx.customer.updateMany({
            where: { document, email: null },
            data: { email },
          });
        }
        const customers = await tx.customer.findMany({
          where: { document: { in: customerData.map((c) => c.document) } },
        });
        const customerIds = new Map(customers.map((c) => [c.document, c.id]));

        const orders = buildSeedOrders();
        const existing = await tx.order.findMany({
          where: { orderNumber: { in: orders.map((o) => o.orderNumber) } },
          select: { orderNumber: true },
        });
        const existingNumbers = new Set(existing.map((o) => o.orderNumber));

        let ordersCreated = 0;
        for (const order of orders) {
          if (existingNumbers.has(order.orderNumber)) {
            continue;
          }
          const customerId = customerIds.get(order.customerDocument)!;
          await tx.order.create({
            data: {
              orderNumber: order.orderNumber,
              status: order.status,
              createdAt: order.createdAt,
              expectedDeliveryDate: new Date(
                `${order.expectedDeliveryDate}T00:00:00.000Z`,
              ),
              deliveryAddress: order.deliveryAddress,
              customerId,
              createdById: userIds.get(order.createdByEmail)!,
              items: {
                create: order.items.map((item) => ({
                  description: item.description,
                  price: new Prisma.Decimal(item.price),
                })),
              },
            },
          });
          await tx.customer.update({
            where: { id: customerId },
            data: { ordersCount: { increment: 1 } },
          });
          ordersCreated++;
        }

        return {
          customersCreated,
          ordersCreated,
          ordersSkipped: orders.length - ordersCreated,
        };
      },
      { timeout: 30_000 },
    );

    // Sem senhas, hashes ou tokens no log.
    console.log(
      `Seed concluído: ${users.length} usuários garantidos, ` +
        `${summary.customersCreated} clientes criados, ` +
        `${summary.ordersCreated} pedidos criados, ` +
        `${summary.ordersSkipped} já existentes.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Falha no seed:', error);
  process.exitCode = 1;
});
