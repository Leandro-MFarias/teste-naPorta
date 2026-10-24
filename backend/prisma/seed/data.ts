import type { OrderStatus, Role } from '../../src/generated/prisma/enums.js';

/**
 * Dados fictícios e determinísticos do seed (seção 18.3). Nada aqui é
 * aleatório: toda execução produz os mesmos registros. Nomes, documentos e
 * endereços são inventados; os documentos só têm dígitos verificadores
 * válidos para passar na validação.
 */

export interface SeedUser {
  name: string;
  email: string;
  /** Apenas para desenvolvimento local; gravada como hash Argon2id. */
  password: string;
  role: Role;
}

export interface SeedCustomer {
  name: string;
  document: string;
}

export interface SeedOrder {
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  /** YYYY-MM-DD */
  expectedDeliveryDate: string;
  deliveryAddress: string;
  customerDocument: string;
  createdByEmail: string;
  items: { description: string; price: string }[];
}

export const SEED_USERS: readonly SeedUser[] = [
  {
    name: 'Administrador Demo',
    email: 'admin@example.com',
    password: 'Admin12345',
    role: 'ADMIN',
  },
  {
    name: 'Usuário Demo',
    email: 'user@example.com',
    password: 'User12345',
    role: 'USER',
  },
];

export const SEED_CUSTOMERS: readonly SeedCustomer[] = [
  { name: 'Ana Fictícia Souza', document: '12345678062' },
  { name: 'Bruno Exemplo Lima', document: '98765432029' },
  { name: 'Carla Teste Rocha', document: '24681357090' },
  { name: 'Diego Modelo Alves', document: '13579246070' },
  { name: 'Elisa Amostra Costa', document: '31415926085' },
  { name: 'Comercial Exemplo Ltda', document: '11222333000181' },
  { name: 'Distribuidora Fictícia S.A.', document: '44555666000181' },
  // CNPJ alfanumérico (formato novo da Receita Federal).
  { name: 'Loja Demonstração ME', document: 'A1B2C3D4000193' },
];

const ADDRESSES = [
  'Rua das Acácias, 120, Centro, São Paulo - SP',
  'Avenida Brasil, 2500, Jardim América, Rio de Janeiro - RJ',
  'Rua XV de Novembro, 45, Centro, Curitiba - PR',
  'Avenida Afonso Pena, 980, Funcionários, Belo Horizonte - MG',
  'Rua da Praia, 300, Centro Histórico, Porto Alegre - RS',
  'Avenida Sete de Setembro, 77, Barra, Salvador - BA',
];

const PRODUCTS: readonly [string, string][] = [
  ['Caixa de som Bluetooth', '199.90'],
  ['Fone de ouvido sem fio', '149.50'],
  ['Cabo USB-C 2 m', '29.90'],
  ['Carregador rápido 30 W', '89.00'],
  ['Teclado mecânico', '349.99'],
  ['Mouse óptico', '59.90'],
  ['Monitor 24 polegadas', '899.00'],
  ['Suporte para notebook', '119.90'],
  ['Webcam Full HD', '229.00'],
  ['Hub USB 4 portas', '74.90'],
];

// Todos os seis status, com mais pedidos nos estados intermediários.
const STATUS_CYCLE: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PREPARATION',
  'SHIPPED',
  'DELIVERED',
  'DELIVERED',
  'CANCELED',
  'PENDING',
];

export const SEED_ORDER_COUNT = 24;

const DAY_MS = 24 * 60 * 60 * 1000;
// Primeiro pedido: 1º de julho de 2026, 09:00 UTC.
const FIRST_CREATED_AT = Date.UTC(2026, 6, 1, 9, 0, 0);

/** Pedidos PED-2026-0001 a PED-2026-0024, de julho a outubro de 2026. */
export function buildSeedOrders(): SeedOrder[] {
  return Array.from({ length: SEED_ORDER_COUNT }, (_, i) => {
    // A cada ~5 dias, com horários variados; os pedidos 12 e 13 caem no
    // mesmo dia (um deles às 23:30) para demonstrar o filtro por período.
    const dayOffset = i * 5 - (i >= 12 ? 5 : 0);
    const hourOffset = i === 12 ? 14.5 : (i % 4) * 2.5;
    const createdAt = new Date(
      FIRST_CREATED_AT + dayOffset * DAY_MS + hourOffset * 60 * 60 * 1000,
    );
    const delivery = new Date(createdAt.getTime() + (7 + (i % 3) * 3) * DAY_MS);

    const itemCount = 1 + (i % 3);
    const items = Array.from({ length: itemCount }, (_, j) => {
      const [description, price] = PRODUCTS[(i * 3 + j) % PRODUCTS.length];
      return { description, price };
    });

    return {
      orderNumber: `PED-2026-${String(i + 1).padStart(4, '0')}`,
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
      createdAt,
      expectedDeliveryDate: delivery.toISOString().slice(0, 10),
      deliveryAddress: ADDRESSES[i % ADDRESSES.length],
      customerDocument: SEED_CUSTOMERS[i % SEED_CUSTOMERS.length].document,
      createdByEmail: SEED_USERS[i % SEED_USERS.length].email,
      items,
    };
  });
}
