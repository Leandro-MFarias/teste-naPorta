/** Política de senha do backend: 8 a 128 caracteres, letra e número. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_POLICY_PATTERN = /^(?=.*\p{L})(?=.*\d)/u;

export const PASSWORD_HINT = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com pelo menos uma letra e um número.`;

/**
 * Validação antecipada da troca de senha, com as mesmas regras da API.
 * Retorna os erros por campo ou undefined se estiver tudo certo.
 */
export function validateNewPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Record<string, string> | undefined {
  const errors: Record<string, string> = {};

  if (!currentPassword) {
    errors.currentPassword = 'Informe a senha atual.';
  }
  if (
    newPassword.length < PASSWORD_MIN_LENGTH ||
    newPassword.length > PASSWORD_MAX_LENGTH
  ) {
    errors.newPassword = `A senha deve ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`;
  } else if (!PASSWORD_POLICY_PATTERN.test(newPassword)) {
    errors.newPassword =
      'A senha deve conter pelo menos uma letra e um número.';
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'A nova senha deve ser diferente da atual.';
  }
  if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'As senhas não conferem.';
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}
