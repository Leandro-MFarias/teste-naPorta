import { BadRequestException, Injectable } from '@nestjs/common';
import type { ApiWarning } from '../../common/interfaces/api-response.interface.js';
import type { Customer, Prisma } from '../../generated/prisma/client.js';
import type { CustomerRequest } from '../orders/interfaces/order-request.interface.js';
import {
  customerEmailUpdatedWarning,
  customerNameUpdatedWarning,
} from './customer.warnings.js';
import { parseDocument } from './document.js';

export const INVALID_DOCUMENT_MESSAGE =
  'Documento inválido: informe um CPF ou CNPJ válido.';

export interface ResolvedCustomer {
  customer: Customer;
  /** true se o cliente foi cadastrado nesta chamada. */
  created: boolean;
  /** Avisos de nome e/ou email atualizados; vazio se nada mudou. */
  warnings: ApiWarning[];
}

/**
 * Regras de cliente (seção 10). Não há CRUD próprio: clientes são criados
 * ou reutilizados pelas operações de pedido, dentro da transação delas.
 */
@Injectable()
export class CustomersService {
  /**
   * Busca o cliente pelo documento normalizado, criando-o se não existir.
   * Se já existir com outro nome ou email, atualiza o cadastro e retorna
   * um aviso para cada campo alterado (preencher o email de um cliente
   * antigo, que não tinha, não gera aviso). Não altera ordersCount: isso
   * cabe à operação de pedido, na mesma transação.
   *
   * Seguro sob concorrência: o INSERT usa ON CONFLICT DO NOTHING
   * (createMany com skipDuplicates). Se outra transação estiver criando o
   * mesmo documento, o PostgreSQL espera ela terminar, e a leitura
   * seguinte encontra o registro, sem duplicar nem abortar a transação.
   */
  async resolve(
    tx: Prisma.TransactionClient,
    { name, document, email }: CustomerRequest,
  ): Promise<ResolvedCustomer> {
    const parsed = parseDocument(document);
    if (!parsed) {
      throw new BadRequestException(INVALID_DOCUMENT_MESSAGE);
    }

    const { count } = await tx.customer.createMany({
      data: [{ name, document: parsed.value, type: parsed.type, email }],
      skipDuplicates: true,
    });
    const customer = await tx.customer.findUniqueOrThrow({
      where: { document: parsed.value },
    });
    const created = count === 1;

    const warnings: ApiWarning[] = [];
    const changes: Prisma.CustomerUpdateInput = {};
    if (customer.name !== name) {
      changes.name = name;
      warnings.push(customerNameUpdatedWarning(customer.type));
    }
    if (customer.email !== email) {
      changes.email = email;
      if (customer.email !== null) {
        warnings.push(customerEmailUpdatedWarning(customer.type));
      }
    }

    if (Object.keys(changes).length === 0) {
      return { customer, created, warnings };
    }
    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: changes,
    });
    return { customer: updated, created, warnings };
  }
}
