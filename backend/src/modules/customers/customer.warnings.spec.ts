import { describe, expect, it } from 'vitest';
import { customerNameUpdatedWarning } from './customer.warnings.js';

describe('customerNameUpdatedWarning', () => {
  it('usa mensagem de CPF para pessoa física', () => {
    expect(customerNameUpdatedWarning('PERSON')).toEqual({
      code: 'CUSTOMER_NAME_UPDATED',
      message: 'CPF já cadastrado. O nome do cliente foi atualizado.',
    });
  });

  it('usa mensagem de CNPJ e razão social para pessoa jurídica', () => {
    expect(customerNameUpdatedWarning('COMPANY')).toEqual({
      code: 'CUSTOMER_NAME_UPDATED',
      message: 'CNPJ já cadastrado. A razão social foi atualizada.',
    });
  });
});
