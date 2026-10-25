import type { ApiWarningCode, CustomerType } from './api/types';

/** Mesmos textos do backend (customer.warnings.ts), por tipo de cliente. */
const MESSAGES: Record<ApiWarningCode, Record<CustomerType, string>> = {
  CUSTOMER_NAME_UPDATED: {
    PERSON: 'CPF já cadastrado. O nome do cliente foi atualizado.',
    COMPANY: 'CNPJ já cadastrado. A razão social foi atualizada.',
  },
  CUSTOMER_EMAIL_UPDATED: {
    PERSON: 'CPF já cadastrado. O email do cliente foi atualizado.',
    COMPANY: 'CNPJ já cadastrado. O email da empresa foi atualizado.',
  },
};

/** Converte "CODE1,CODE2" (da URL) nas mensagens de aviso. */
export function warningMessages(
  codes: string | undefined,
  type: CustomerType,
): string[] {
  return (codes ?? '')
    .split(',')
    .filter((code): code is ApiWarningCode => code in MESSAGES)
    .map((code) => MESSAGES[code][type]);
}
