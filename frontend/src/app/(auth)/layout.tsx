import { Logo } from '@/components/logo';

/** Tela dividida: painel da marca (tons do email) e o formulário. */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-800 p-12 text-ink-100 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-brand-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-48 -left-24 size-[26rem] rounded-full bg-brand-700/30 blur-3xl"
          aria-hidden="true"
        />

        <Logo tone="light" className="relative" />

        <div className="relative max-w-md">
          <p className="text-sm font-medium tracking-wider text-brand-400 uppercase">
            Gestão de entregas
          </p>
          <h2 className="mt-3 text-4xl leading-tight font-semibold text-white">
            Do pedido à porta do cliente, tudo em um só lugar.
          </h2>
          <p className="mt-4 text-ink-300">
            Cadastre pedidos, acompanhe cada etapa da entrega e mantenha seus
            clientes informados por email automaticamente.
          </p>

          <ol className="mt-10 space-y-3">
            {['Pedido confirmado', 'Em preparação', 'A caminho'].map(
              (step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-400 ring-1 ring-brand-500/40">
                    {i + 1}
                  </span>
                  <span className="text-sm text-ink-200">{step}</span>
                </li>
              ),
            )}
          </ol>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-ink-400">
          <span className="h-8 w-0.5 bg-brand-500" aria-hidden="true" />
          Atenciosamente, a equipe naPorta
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
