/** Códigos de aviso de negócio retornados em `warnings`. */
export const API_WARNING_CODES = ['CUSTOMER_NAME_UPDATED'] as const;
export type ApiWarningCode = (typeof API_WARNING_CODES)[number];

/** Aviso de negócio: a operação foi concluída, mas merece atenção. */
export interface ApiWarning {
  code: ApiWarningCode;
  message: string;
}

/** Resposta de recurso individual (seção 14.1). */
export interface ApiResponse<T> {
  data: T;
  /** Presente apenas quando houver aviso. */
  warnings?: ApiWarning[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Resposta de listagem paginada (seção 13.2). */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
