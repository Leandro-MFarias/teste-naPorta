import type { ApiWarning } from '../../common/interfaces/api-response.interface.js';
import type { CustomerType } from '../../generated/prisma/enums.js';

export const CUSTOMER_NAME_UPDATED_MESSAGES: Record<CustomerType, string> = {
  PERSON: 'CPF já cadastrado. O nome do cliente foi atualizado.',
  COMPANY: 'CNPJ já cadastrado. A razão social foi atualizada.',
};

/**
 * Aviso retornado quando o documento já existia com outro nome e o
 * cadastro do cliente foi atualizado (seção 10.1).
 */
export function customerNameUpdatedWarning(type: CustomerType): ApiWarning {
  return {
    code: 'CUSTOMER_NAME_UPDATED',
    message: CUSTOMER_NAME_UPDATED_MESSAGES[type],
  };
}

export const CUSTOMER_EMAIL_UPDATED_MESSAGES: Record<CustomerType, string> = {
  PERSON: 'CPF já cadastrado. O email do cliente foi atualizado.',
  COMPANY: 'CNPJ já cadastrado. O email da empresa foi atualizado.',
};

/**
 * Aviso retornado quando o documento já existia com outro email e o
 * cadastro foi atualizado. Não é emitido ao preencher o email de um
 * cliente que ainda não tinha.
 */
export function customerEmailUpdatedWarning(type: CustomerType): ApiWarning {
  return {
    code: 'CUSTOMER_EMAIL_UPDATED',
    message: CUSTOMER_EMAIL_UPDATED_MESSAGES[type],
  };
}
