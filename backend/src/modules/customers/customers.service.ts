import { BadRequestException, Injectable } from '@nestjs/common';
import type { ApiWarning } from '../../common/interfaces/api-response.interface.js';
import type { Customer, Prisma } from '../../generated/prisma/client.js';
import type { CustomerRequest } from '../orders/interfaces/order-request.interface.js';
import { customerNameUpdatedWarning } from './customer.warnings.js';
import { parseDocument } from './document.js';

export const INVALID_DOCUMENT_MESSAGE =
  'Documento inválido: informe um CPF ou CNPJ válido.';

export interface ResolvedCustomer {
  customer: Customer;
  /** Presente quando o nome do cliente existente foi atualizado. */
  warning?: ApiWarning;
}

/**
 * Regras de cliente (seção 10). Não há CRUD próprio: clientes são criados
 * ou reutilizados pelas operações de pedido, dentro da transação delas.
 */
@Injectable()
export class CustomersService {
  /**
   * Busca o cliente pelo documento normalizado, criando-o se não existir.
   * Se já existir com outro nome, atualiza o nome e retorna um aviso.
   * Não altera ordersCount: isso cabe à operação de pedido, na mesma
   * transação.
   *
   * Seguro sob concorrência: o INSERT usa ON CONFLICT DO NOTHING
   * (createMany com skipDuplicates). Se outra transação estiver criando o
   * mesmo documento, o PostgreSQL espera ela terminar, e a leitura
   * seguinte encontra o registro, sem duplicar nem abortar a transação.
   */
  async resolve(
    tx: Prisma.TransactionClient,
    { name, document }: CustomerRequest,
  ): Promise<ResolvedCustomer> {
    const parsed = parseDocument(document);
    if (!parsed) {
      throw new BadRequestException(INVALID_DOCUMENT_MESSAGE);
    }

    await tx.customer.createMany({
      data: [{ name, document: parsed.value, type: parsed.type }],
      skipDuplicates: true,
    });
    const customer = await tx.customer.findUniqueOrThrow({
      where: { document: parsed.value },
    });

    if (customer.name === name) {
      return { customer };
    }

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: { name },
    });
    return {
      customer: updated,
      warning: customerNameUpdatedWarning(updated.type),
    };
  }
}
