'use client';

import { useEffect } from 'react';

/**
 * Remove da URL os parâmetros de aviso único (ex.: ?resultado=criado) depois
 * de exibidos, para não reaparecerem ao recarregar ou compartilhar o link.
 */
export function ClearSearchParams() {
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  return null;
}
