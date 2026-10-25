import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { fetchMe } from './api/endpoints';
import type { User } from './api/types';

/**
 * Data Access Layer: o usuário da sessão, consultado uma vez por request
 * (GET /auth/me). A API é quem valida o token; aqui só decidimos para
 * onde levar o usuário.
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  const { data } = await fetchMe();
  return data;
});

/** Usuário com acesso liberado; no primeiro acesso, leva à troca de senha. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (user.mustChangePassword) {
    redirect('/primeiro-acesso');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    redirect('/pedidos');
  }
  return user;
}
