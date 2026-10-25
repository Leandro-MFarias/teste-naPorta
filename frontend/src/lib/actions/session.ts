'use server';

import { redirect } from 'next/navigation';
import { clearToken } from '../session';

export async function logoutAction() {
  await clearToken();
  redirect('/login?motivo=saiu');
}
