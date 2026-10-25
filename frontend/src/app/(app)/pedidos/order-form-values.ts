import type { Order, OrderPayload } from '@/lib/api/types';
import { isValidDocument } from '@/lib/document';
import { formatDocument } from '@/lib/format';

/** Limites do backend (create-order.dto.ts). */
export const LIMITS = {
  orderNumber: 50,
  deliveryAddress: 500,
  customerName: 150,
  email: 254,
  itemDescription: 255,
  items: 100,
  price: 9_999_999_999.99,
} as const;

export interface ItemValues {
  /** Chave estável para a lista no React. */
  key: string;
  description: string;
  /** Texto digitado, aceita vírgula decimal (ex.: "199,90"). */
  price: string;
}

export interface OrderFormValues {
  orderNumber: string;
  expectedDeliveryDate: string;
  deliveryAddress: string;
  customerName: string;
  customerDocument: string;
  customerEmail: string;
  items: ItemValues[];
}

// Contador em vez de UUID aleatório: o valor inicial é renderizado no
// servidor e precisa ser determinístico.
let itemCounter = 0;

export function newItem(): ItemValues {
  itemCounter += 1;
  return { key: `new-${itemCounter}`, description: '', price: '' };
}

export function emptyOrderValues(): OrderFormValues {
  return {
    orderNumber: '',
    expectedDeliveryDate: '',
    deliveryAddress: '',
    customerName: '',
    customerDocument: '',
    customerEmail: '',
    items: [{ key: 'new-0', description: '', price: '' }],
  };
}

export function orderToValues(order: Order): OrderFormValues {
  return {
    orderNumber: order.orderNumber,
    expectedDeliveryDate: order.expectedDeliveryDate,
    deliveryAddress: order.deliveryAddress,
    customerName: order.customer.name,
    customerDocument: formatDocument(
      order.customer.document,
      order.customer.type,
    ),
    customerEmail: order.customer.email ?? '',
    items: order.items.map((item) => ({
      key: item.id,
      description: item.description,
      price: item.price.replace('.', ','),
    })),
  };
}

/** "1.234,56" ou "1234.56" -> 1234.56; NaN se não for um valor válido. */
export function parsePrice(text: string): number {
  const value = text.trim().replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(value)) {
    return NaN;
  }
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value;
  return Number(normalized);
}

const ORDER_NUMBER = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Erros por campo, com as mesmas chaves que a API usa nas mensagens. */
export function validateOrder(values: OrderFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = (key: string, value: string, label: string) => {
    if (!value.trim()) {
      errors[key] = `Informe ${label}.`;
    }
  };

  required('orderNumber', values.orderNumber, 'o número do pedido');
  if (
    values.orderNumber.trim() &&
    !ORDER_NUMBER.test(values.orderNumber.trim())
  ) {
    errors.orderNumber =
      'Use letras, números, ".", "_", "/" ou "-", começando com letra ou número.';
  }
  required('expectedDeliveryDate', values.expectedDeliveryDate, 'a data');
  required('deliveryAddress', values.deliveryAddress, 'o endereço');
  required('customer.name', values.customerName, 'o nome do cliente');
  required('customer.document', values.customerDocument, 'o CPF ou CNPJ');
  if (
    values.customerDocument.trim() &&
    !isValidDocument(values.customerDocument)
  ) {
    errors['customer.document'] = 'CPF ou CNPJ inválido.';
  }
  required('customer.email', values.customerEmail, 'o email do cliente');
  if (values.customerEmail.trim() && !EMAIL.test(values.customerEmail.trim())) {
    errors['customer.email'] = 'Email inválido.';
  }

  if (values.items.length === 0) {
    errors.items = 'Adicione pelo menos um item.';
  }
  values.items.forEach((item, i) => {
    if (!item.description.trim()) {
      errors[`items.${i}.description`] = 'Informe a descrição.';
    }
    const price = parsePrice(item.price);
    if (!item.price.trim()) {
      errors[`items.${i}.price`] = 'Informe o valor.';
    } else if (Number.isNaN(price) || price > LIMITS.price) {
      errors[`items.${i}.price`] = 'Valor inválido.';
    }
  });

  return errors;
}

export function toPayload(values: OrderFormValues): OrderPayload {
  return {
    orderNumber: values.orderNumber.trim(),
    expectedDeliveryDate: values.expectedDeliveryDate,
    deliveryAddress: values.deliveryAddress.trim(),
    customer: {
      name: values.customerName.trim(),
      document: values.customerDocument.trim(),
      email: values.customerEmail.trim(),
    },
    items: values.items.map((item) => ({
      description: item.description.trim(),
      price: parsePrice(item.price),
    })),
  };
}

/** Chaves de campo que a API pode citar nas mensagens de validação. */
export function orderFieldKeys(itemCount: number): string[] {
  return [
    'orderNumber',
    'expectedDeliveryDate',
    'deliveryAddress',
    'customer.name',
    'customer.document',
    'customer.email',
    'items',
    ...Array.from({ length: itemCount }, (_, i) => [
      `items.${i}.description`,
      `items.${i}.price`,
    ]).flat(),
  ];
}
