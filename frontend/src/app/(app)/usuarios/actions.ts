'use server';

import { createUser } from '@/lib/api/endpoints';
import type { Role } from '@/lib/api/types';
import { requireAdmin } from '@/lib/dal';
import { toFormState, type FormState } from '@/lib/form-state';

const FIELDS = ['name', 'email', 'role'] as const;

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  const values = { name, email, role };

  const fieldErrors: Record<string, string> = {};
  if (!name) {
    fieldErrors.name = 'Informe o nome.';
  }
  if (!email) {
    fieldErrors.email = 'Informe o email.';
  }
  if (role !== 'ADMIN' && role !== 'USER') {
    fieldErrors.role = 'Escolha o perfil de acesso.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  try {
    const { data } = await createUser({ name, email, role: role as Role });
    return {
      success: `${data.name} foi cadastrado(a). A senha temporária foi enviada para ${data.email}.`,
    };
  } catch (error) {
    return { ...toFormState(error, FIELDS), values };
  }
}
