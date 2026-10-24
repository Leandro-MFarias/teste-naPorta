-- Email do cliente: destino das notificações de pedido e status. Nulo
-- apenas para clientes criados antes desta migration; a API exige o campo.
ALTER TABLE "customers" ADD COLUMN "email" VARCHAR(254);

-- Usuários cadastrados com senha temporária precisam trocá-la no primeiro
-- acesso. Usuários existentes não são afetados (padrão false).
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
