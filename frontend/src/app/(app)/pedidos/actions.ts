'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { createOrder, deleteOrder, updateOrder } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { ApiWarning, OrderPayload, OrderStatus } from '@/lib/api/types';
import { requireAdmin, requireUser } from '@/lib/dal';
import { toFormState, type FormState } from '@/lib/form-state';
import { orderFieldKeys } from './order-form-values';

/** Leva ao detalhe do pedido com o resultado e os avisos na URL. */
function detailUrl(id: string, result: string, warnings?: ApiWarning[]) {
  const params = new URLSearchParams({ resultado: result });
  if (warnings?.length) {
    params.set('avisos', warnings.map((w) => w.code).join(','));
  }
  return `/pedidos/${id}?${params}`;
}

function orderErrorState(error: unknown, itemCount: number): FormState {
  // Número duplicado: a API responde 409 sem prefixo de campo.
  if (error instanceof ApiError && error.status === 409) {
    return { fieldErrors: { orderNumber: error.messages[0] } };
  }
  return toFormState(error, orderFieldKeys(itemCount));
}

export async function createOrderAction(
  _prev: FormState,
  payload: OrderPayload,
): Promise<FormState> {
  await requireUser();
  let target: string;
  try {
    const { data, warnings } = await createOrder(payload);
    target = detailUrl(data.id, 'criado', warnings);
  } catch (error) {
    return orderErrorState(error, payload.items.length);
  }
  redirect(target);
}

export async function updateOrderAction(
  id: string,
  _prev: FormState,
  payload: OrderPayload,
): Promise<FormState> {
  await requireUser();
  let target: string;
  try {
    const { data, warnings } = await updateOrder(id, payload);
    target = detailUrl(data.id, 'atualizado', warnings);
  } catch (error) {
    return orderErrorState(error, payload.items.length);
  }
  redirect(target);
}

export async function changeStatusAction(
  id: string,
  status: OrderStatus,
): Promise<FormState> {
  await requireUser();
  try {
    await updateOrder(id, { status });
  } catch (error) {
    return toFormState(error, ['status']);
  }
  refresh();
  return { success: 'Status atualizado. O cliente foi avisado por email.' };
}

export async function deleteOrderAction(id: string): Promise<FormState> {
  await requireAdmin();
  try {
    await deleteOrder(id);
  } catch (error) {
    return toFormState(error);
  }
  redirect('/pedidos?excluido=1');
}
