'use server';

import { changePassword } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/dal';
import { toFormState, type FormState } from '@/lib/form-state';
import { validateNewPassword } from '@/lib/password';

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  const fieldErrors = validateNewPassword(
    currentPassword,
    newPassword,
    confirmPassword,
  );
  if (fieldErrors) {
    return { fieldErrors };
  }

  try {
    await changePassword(currentPassword, newPassword);
  } catch (error) {
    return toFormState(error, ['currentPassword', 'newPassword']);
  }
  return { success: 'Senha alterada com sucesso.' };
}
