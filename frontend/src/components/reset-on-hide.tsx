'use client';

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Com Cache Components, a rota anterior fica oculta (<Activity>) em vez de
 * desmontar, preservando o estado. Depois de um envio (submit ou clique em
 * botão), avisos e valores antigos não devem reaparecer ao voltar à
 * página: o cleanup roda quando a rota é ocultada e troca a key, remontando
 * os filhos. Sem envio, nada é resetado (um rascunho continua lá).
 * Padrão de node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
 */
export function ResetOnHide({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState(0);
  const shouldReset = useRef(false);

  useLayoutEffect(
    () => () => {
      if (shouldReset.current) {
        shouldReset.current = false;
        setInstance((i) => i + 1);
      }
    },
    [],
  );

  // Envio de formulário, ou ação por botão fora de formulário (ex.: mudar
  // status). Botões auxiliares de formulário (ex.: "Adicionar item") não
  // contam, para não descartar um rascunho.
  function arm(event: React.SyntheticEvent) {
    const button = (event.target as HTMLElement).closest('button');
    if (event.type === 'submit' || (button && !button.closest('form'))) {
      shouldReset.current = true;
    }
  }

  return (
    <div className="contents" onSubmitCapture={arm} onClickCapture={arm}>
      <Fragment key={instance}>{children}</Fragment>
    </div>
  );
}
