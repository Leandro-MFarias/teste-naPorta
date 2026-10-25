'use server';

import { redirect } from 'next/navigation';
import { changePassword, login } from '@/lib/api/endpoints';
import { setToken } from '@/lib/session';
import { toFormState, type FormState } from '@/lib/form-state';
import { validateNewPassword } from '@/lib/password';

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');
  const values = { email };

  if (!email || !password) {
    return { errors: ['Informe email e senha.'], values };
  }

  let mustChangePassword: boolean;
  try {
    const { data } = await login(email, password);
    await setToken(data.accessToken, data.expiresIn);
    mustChangePassword = data.user.mustChangePassword;
  } catch (error) {
    return { ...toFormState(error, ['email', 'password']), values };
  }

  redirect(mustChangePassword ? '/primeiro-acesso' : safeNext(next));
}

export async function firstAccessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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

  redirect('/pedidos?boas-vindas=1');
}

/** Aceita só caminhos internos, para não virar redirecionamento aberto. */
function safeNext(next: string): string {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/pedidos';
}
