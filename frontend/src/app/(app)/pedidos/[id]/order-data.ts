import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getOrder } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';

/** Pedido ativo ou página 404 (inexistente, excluído ou id inválido). */
export const getOrderOrNotFound = cache(async (id: string) => {
  try {
    const { data } = await getOrder(id);
    return data;
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) {
      notFound();
    }
    throw error;
  }
});
