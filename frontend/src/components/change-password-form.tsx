'use client';

import { useActionState } from 'react';
import { PASSWORD_HINT } from '@/lib/password';
import type { FormState } from '@/lib/form-state';
import { PasswordInput } from './password-input';
import { Alert } from './ui/alert';
import { Field } from './ui/field';
import { SubmitButton } from './ui/submit-button';

interface ChangePasswordFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  currentLabel: string;
  submitLabel: string;
}

/** Troca de senha: usada no primeiro acesso e no perfil. */
export function ChangePasswordForm({
  action,
  currentLabel,
  submitLabel,
}: ChangePasswordFormProps) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.errors && <Alert tone="error" messages={state.errors} />}
      {state.success && <Alert tone="success" messages={[state.success]} />}

      <Field
        label={currentLabel}
        htmlFor="currentPassword"
        error={errors?.currentPassword}
      >
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          invalid={!!errors?.currentPassword}
          required
        />
      </Field>

      <Field
        label="Nova senha"
        htmlFor="newPassword"
        error={errors?.newPassword}
        hint={PASSWORD_HINT}
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          invalid={!!errors?.newPassword}
          required
        />
      </Field>

      <Field
        label="Confirme a nova senha"
        htmlFor="confirmPassword"
        error={errors?.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          invalid={!!errors?.confirmPassword}
          required
        />
      </Field>

      <SubmitButton className="w-full sm:w-auto" pendingLabel="Salvando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
