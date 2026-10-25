'use client';

import { useActionState } from 'react';
import { PasswordInput } from '@/components/password-input';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { FormState } from '@/lib/form-state';
import { loginAction } from '../actions';

export function LoginForm({ notice, next }: { notice?: string; next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.errors ? (
        <Alert tone="error" messages={state.errors} />
      ) : (
        notice && <Alert tone="info" messages={[notice]} />
      )}

      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          defaultValue={state.values?.email}
          invalid={!!state.fieldErrors?.email}
          required
          autoFocus
        />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        error={state.fieldErrors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          invalid={!!state.fieldErrors?.password}
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
