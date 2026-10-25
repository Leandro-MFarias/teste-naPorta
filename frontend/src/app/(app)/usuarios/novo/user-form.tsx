'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/cn';
import type { FormState } from '@/lib/form-state';
import { createUserAction } from '../actions';

const ROLES = [
  {
    value: 'USER',
    label: 'Usuário',
    description: 'Cadastra, edita e acompanha pedidos.',
  },
  {
    value: 'ADMIN',
    label: 'Administrador',
    description:
      'Tudo do usuário, além de excluir pedidos e cadastrar usuários.',
  },
];

export function UserForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createUserAction,
    {},
  );
  const errors = state.fieldErrors;
  const role = state.values?.role ?? 'USER';

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.errors && <Alert tone="error" messages={state.errors} />}
      {state.success && (
        <Alert
          tone="success"
          title="Usuário cadastrado"
          messages={[state.success]}
        />
      )}

      <Field label="Nome" htmlFor="name" error={errors?.name}>
        <Input
          id="name"
          name="name"
          maxLength={150}
          defaultValue={state.values?.name}
          invalid={!!errors?.name}
          autoComplete="off"
          required
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        error={errors?.email}
        hint="Recebe o email de boas-vindas com a senha temporária."
      >
        <Input
          id="email"
          name="email"
          type="email"
          maxLength={254}
          defaultValue={state.values?.email}
          invalid={!!errors?.email}
          autoComplete="off"
          required
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">
          Perfil de acesso
        </legend>
        {/* key: volta à opção enviada quando o formulário é reiniciado. */}
        <div key={role} className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300',
                'has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-500',
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={option.value === role}
                className="mt-0.5 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors?.role && (
          <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>
        )}
      </fieldset>

      <SubmitButton pendingLabel="Cadastrando…">Cadastrar usuário</SubmitButton>
    </form>
  );
}
