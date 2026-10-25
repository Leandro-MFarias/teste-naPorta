import { ApiError } from './api/errors';

/** Resultado de uma Server Action de formulário. */
export interface FormState {
  /** Erros sem campo associado (ex.: credenciais inválidas). */
  errors?: string[];
  /** Erro por campo, com a chave usada pela API (ex.: "customer.document"). */
  fieldErrors?: Record<string, string>;
  /** Valores enviados, para repreencher o formulário após um erro. */
  values?: Record<string, string>;
  success?: string;
}

/**
 * Separa as mensagens da API por campo. O backend prefixa cada mensagem de
 * validação com o caminho do campo ("customer.document deve ser..."); as
 * que casam com um campo conhecido viram erro do campo, sem o prefixo.
 */
export function splitApiMessages(
  messages: string[],
  fields: readonly string[],
): Pick<FormState, 'errors' | 'fieldErrors'> {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const byLength = [...fields].sort((a, b) => b.length - a.length);

  for (const message of messages) {
    const field = byLength.find((f) => message.startsWith(`${f} `));
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = capitalize(message.slice(field.length + 1));
    } else if (!field) {
      errors.push(message);
    }
  }
  return {
    ...(errors.length > 0 && { errors }),
    ...(Object.keys(fieldErrors).length > 0 && { fieldErrors }),
  };
}

/** Converte uma exceção em estado de formulário; relança o que não é da API. */
export function toFormState(
  error: unknown,
  fields: readonly string[] = [],
): FormState {
  if (error instanceof ApiError) {
    return splitApiMessages(error.messages, fields);
  }
  throw error;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
