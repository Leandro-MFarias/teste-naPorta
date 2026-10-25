import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-semibold text-brand-500">404</p>
      <h1 className="mt-4 text-xl font-semibold text-ink-900">
        Não encontramos esta página
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        O pedido pode ter sido excluído ou o endereço está incorreto.
      </p>
      <ButtonLink href="/pedidos" className="mt-8">
        Voltar para pedidos
      </ButtonLink>
    </div>
  );
}
