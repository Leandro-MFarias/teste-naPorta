# naPorta API

API REST para gestão de pedidos de entrega: autenticação de usuários,
cadastro de pedidos com itens, criação e reutilização automática de
clientes por CPF/CNPJ, controle de status e exclusão lógica.

Este repositório contém apenas o backend. O plano completo da fundação
está em [`docs/PLANO_FUNDACAO.md`](docs/PLANO_FUNDACAO.md).

## Sumário

- [API First e arquitetura](#api-first-e-arquitetura)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Configuração (.env)](#configuração-env)
- [Execução local](#execução-local)
- [Execução com Docker Compose](#execução-com-docker-compose)
- [Prisma: client, migrations e seed](#prisma-client-migrations-e-seed)
- [Scripts](#scripts)
- [Testes](#testes)
- [Swagger](#swagger)
- [Autenticação](#autenticação)
- [Endpoints e permissões](#endpoints-e-permissões)
- [Regras de pedidos](#regras-de-pedidos)
- [Formato das respostas](#formato-das-respostas)
- [Segurança em produção](#segurança-em-produção)

## API First e arquitetura

O contrato HTTP é a fonte de verdade: cada endpoint nasce com seus DTOs
de entrada, respostas e erros documentados no Swagger (OpenAPI), e
qualquer cliente (frontend, integrações) é construído a partir desse
contrato.

O código é organizado em módulos de domínio do NestJS:

```text
src/
├── main.ts / app.module.ts / app.setup.ts / swagger.ts
├── common/        # filtro global de erros, guards, decorators, pipes, DTOs comuns
├── config/        # validação das variáveis de ambiente
├── prisma/        # PrismaService (acesso único ao banco)
├── health/        # GET /health
└── modules/
    ├── auth/      # login JWT e hash de senha (Argon2id)
    ├── users/     # cadastro de usuários (ADMIN)
    ├── customers/ # CPF/CNPJ e criação/reutilização de clientes (sem rotas próprias)
    └── orders/    # pedidos, itens, status, filtros e exclusão lógica
prisma/
├── schema.prisma
├── migrations/
└── seed.ts        # + seed/data.ts (dados fictícios)
test/
└── integration/   # testes de integração (banco real isolado)
```

- **Controllers** recebem a requisição e delegam; não têm regra de negócio.
- **DTOs** validam e documentam a entrada; **interfaces** de request e
  response descrevem os contratos TypeScript (request e response de
  usuário são distintas, e nenhuma resposta expõe senha ou hash).
- **Services** implementam as regras e coordenam transações Prisma.
- **Guards** globais aplicam autenticação JWT e autorização por papel.
- **Filtro global de exceções** padroniza todas as respostas de erro.

## Stack

- Node.js 24 e TypeScript (modo estrito), ESM
- NestJS 12
- PostgreSQL 18
- Prisma 7 (driver adapter `pg`)
- JWT (HS256) com `@nestjs/jwt`; senhas com Argon2id
- class-validator / class-transformer
- Swagger (OpenAPI) com `@nestjs/swagger`
- Vitest (testes unitários e de integração)
- Docker e Docker Compose

## Pré-requisitos

- Node.js 24 e npm
- Docker com Docker Compose v2

## Configuração (.env)

A aplicação e o Prisma CLI carregam `.env.<NODE_ENV>` (padrão
`development`) e depois `.env`. Variáveis já definidas no ambiente têm
prioridade. O Compose recebe o mesmo arquivo via `--env-file`.

```bash
cp .env.example .env.development
# edite os valores; gere um JWT_SECRET aleatório:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

| Variável | Descrição |
| --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` (padrão `development`) |
| `PORT` | Porta da API ao rodar localmente (padrão `3000`) |
| `API_PORT` | Porta publicada pela API no Docker Compose (padrão `3000`) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Configuram o container do PostgreSQL |
| `POSTGRES_PORT` | Porta do PostgreSQL publicada no host (padrão `5432`) |
| `DATABASE_URL` | URL de conexão usada pela aplicação local e pelo Prisma CLI |
| `JWT_SECRET` | Obrigatório, mínimo de 32 caracteres |
| `JWT_EXPIRES_IN` | Validade do token, formato `<número><s\|m\|h\|d>`; mínimo `5h` (padrão `5h`) |
| `TEST_DATABASE_URL` | Opcional: banco dos testes de integração (nome deve terminar em `_test`) |

As variáveis são validadas na inicialização: valores ausentes ou
inválidos impedem a aplicação de subir. Arquivos `.env` e `.env.*`
(exceto `.env.example`) não são versionados.

## Execução local

API rodando na máquina, PostgreSQL no Docker:

```bash
npm install            # também executa prisma generate (postinstall)
npm run db:up          # sobe o PostgreSQL e espera ficar saudável
npm run prisma:migrate:deploy
npm run prisma:seed    # opcional: dados de demonstração
npm run start:dev      # API em http://localhost:3000 (sobe o banco se preciso)
```

Para parar o banco: `npm run db:down` (os dados ficam no volume
`postgres-data`).

## Execução com Docker Compose

Sobe PostgreSQL, aplica as migrations e sobe a API em container:

```bash
npm run docker:up      # build das imagens + db + migrate + api
npm run docker:seed    # opcional: seed dentro do container
npm run docker:down    # para e remove os containers (o volume é mantido)
```

- A API fica em `http://localhost:${API_PORT}` (padrão `3000`). Não rode
  `start:dev` ao mesmo tempo na mesma porta.
- O serviço `migrate` executa `prisma migrate deploy` e termina; a API
  só sobe depois que ele conclui com sucesso.
- Dentro do Compose a API conecta no host `db`; a `DATABASE_URL` é
  montada a partir das variáveis `POSTGRES_*` (use uma senha sem
  caracteres que precisem de escape em URL, ou ajuste o `compose.yaml`).
- A imagem da API (`Dockerfile`, estágio `runtime`) roda como usuário
  sem privilégios, com `NODE_ENV=production`, healthcheck em `/health` e
  nenhum segredo embutido: tudo chega por variável de ambiente.
- `npm run db:up` continua subindo apenas o PostgreSQL; a API e o
  `migrate` pertencem ao profile `app` do Compose.

## Prisma: client, migrations e seed

```bash
npm run prisma:generate        # gera o Prisma Client em src/generated (também no postinstall)
npm run prisma:migrate         # desenvolvimento: cria e aplica uma nova migration (prisma migrate dev)
npm run prisma:migrate:deploy  # aplica as migrations versionadas existentes (prisma migrate deploy)
npm run prisma:seed            # popula dados de demonstração
```

As migrations ficam versionadas em `prisma/migrations`. O fluxo normal
não usa `prisma db push`.

### Seed e credenciais de demonstração

O seed é idempotente: pode ser executado várias vezes sem duplicar
dados. Ele cria 2 usuários, 8 clientes fictícios (CPF, CNPJ e CNPJ
alfanumérico) e 24 pedidos (`PED-2026-0001` a `PED-2026-0024`) com os
seis status, de 1 a 3 itens e datas de criação entre julho e outubro de
2026. Usuários existentes não têm a senha alterada; pedidos cujo número
já existe são ignorados. O seed se recusa a rodar com
`NODE_ENV=production`.

| Papel | Email | Senha |
| --- | --- | --- |
| ADMIN | `admin@example.com` | `Admin12345` |
| USER | `user@example.com` | `User12345` |

> **Atenção:** credenciais apenas para desenvolvimento local. Não use o
> seed nem essas credenciais em produção.

## Scripts

| Script | Descrição |
| --- | --- |
| `start` | Inicia a API (`nest start`) |
| `start:dev` | Sobe o banco (`db:up`) e inicia a API em modo watch |
| `start:prod` | Executa o build compilado (`node dist/main`) |
| `build` | Compila para `dist/` |
| `lint` / `lint:check` | ESLint com correção automática / apenas verificação |
| `format` | Prettier em `src/`, `test/` e `prisma/` |
| `test` | Testes unitários (`vitest run`) |
| `test:watch` | Testes unitários em modo watch |
| `test:cov` | Testes unitários com cobertura (`coverage/`) |
| `test:integration` | Testes de integração (`vitest.config.integration.ts`) |
| `db:up` / `db:down` | Sobe / para o PostgreSQL do Compose |
| `docker:up` / `docker:down` | Sobe / para banco, migrations e API em containers |
| `docker:seed` | Executa o seed no container de migrations |
| `prisma:generate` | Gera o Prisma Client |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:migrate:deploy` | `prisma migrate deploy` |
| `prisma:seed` | Executa o seed (`prisma db seed`) |
| `prisma:studio` | Abre o Prisma Studio |

## Testes

O projeto tem apenas testes unitários e de integração (não há suíte E2E).

```bash
npm test                  # unitários
npm run test:cov          # unitários com cobertura
npm run test:integration  # integração (precisa do PostgreSQL: npm run db:up)
```

- **Unitários** (`*.spec.ts` em `src/`, `prisma/` e `test/`): services,
  guards, validações, CPF/CNPJ, transições de status, mapeamentos e
  rotas HTTP com dependências substituídas por mocks.
- **Integração** (`*.integration-spec.ts`): sobem o `AppModule` completo
  e fazem requisições HTTP reais contra um PostgreSQL de verdade —
  transações e rollback, concorrência na criação de clientes, unicidade
  do número do pedido, `ordersCount`, exclusão lógica, filtros,
  paginação, autenticação/autorização e idempotência do seed.

Os testes de integração **nunca usam o banco de desenvolvimento**. Eles
usam `TEST_DATABASE_URL` ou, por padrão, o banco da `DATABASE_URL` com o
sufixo `_test` (ex.: `local_db_test`) no mesmo servidor. O banco é criado
se não existir, recebe as migrations (`prisma migrate deploy`) e tem as
tabelas apagadas antes de cada teste. Qualquer banco cujo nome não
termine em `_test` é recusado. Os arquivos rodam em série.

## Swagger

Com a API rodando:

- Interface: `http://localhost:3000/api/docs`
- Especificação OpenAPI (JSON): `http://localhost:3000/api/docs-json`

Para testar rotas protegidas, faça login em `POST /auth/login`, clique em
**Authorize** e informe o `accessToken`.

## Autenticação

```http
POST /auth/login
Content-Type: application/json

{ "email": "admin@example.com", "password": "Admin12345" }
```

```json
{
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 18000,
    "user": { "id": "...", "name": "...", "email": "admin@example.com", "role": "ADMIN", "isActive": true, "createdAt": "...", "updatedAt": "..." }
  }
}
```

- Envie o token em todas as rotas protegidas:
  `Authorization: Bearer <accessToken>`.
- O token é JWT HS256 com validade de `JWT_EXPIRES_IN` (mínimo 5h).
- Email ou senha inválidos, e usuário inativo, retornam o mesmo
  `401 "Email ou senha inválidos."`.
- A cada requisição o usuário é conferido no banco: se for desativado,
  tokens já emitidos deixam de funcionar, e o papel usado é o atual.

## Endpoints e permissões

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Autentica e retorna o token | Público |
| `GET` | `/health` | Saúde da API e do banco (200 ou 503) | Público |
| `POST` | `/users` | Cadastra usuário | ADMIN |
| `POST` | `/orders` | Cria pedido | ADMIN, USER |
| `GET` | `/orders` | Lista pedidos ativos com filtros e paginação | ADMIN, USER |
| `GET` | `/orders/:id` | Consulta pedido ativo | ADMIN, USER |
| `PATCH` | `/orders/:id` | Edita pedido ativo | ADMIN, USER |
| `DELETE` | `/orders/:id` | Exclusão lógica | ADMIN |

Não há rotas próprias de clientes: eles são geridos pelas operações de
pedido. Sem token, rotas protegidas retornam `401`; com papel
insuficiente, `403`.

### Usuários

`POST /users` recebe `name`, `email` (gravado em minúsculas, único),
`password` (8 a 128 caracteres, com ao menos uma letra e um número) e
`role` (`ADMIN` ou `USER`). A senha é armazenada como hash Argon2id.
Email já cadastrado retorna `409`.

### Listagem: filtros e paginação

`GET /orders` aceita, todos opcionais e combináveis:

| Parâmetro | Descrição |
| --- | --- |
| `page` | Página, a partir de 1 (padrão 1, máximo 1.000.000) |
| `limit` | Itens por página (padrão 10, máximo 100) |
| `orderNumber` | Busca parcial no número, sem diferenciar maiúsculas |
| `status` | Um dos seis status |
| `startDate` | Início do período de **criação** (inclusivo) |
| `endDate` | Fim do período de criação (inclusivo); não pode ser anterior a `startDate` |

- Datas aceitam `YYYY-MM-DD` (interpretado em UTC; em `endDate`, inclui o
  dia inteiro) ou data/hora ISO 8601 com fuso (`2026-10-01T08:00:00-03:00`).
- Pedidos excluídos nunca aparecem.
- Ordenação: `createdAt` decrescente, com `id` como desempate.
- Sem resultados (ou página além do total): `200` com `data: []` e
  `meta.totalPages` correspondente (`0` quando não há registros).
- Valores inválidos de paginação, datas ou status retornam `400`.

## Regras de pedidos

**Criação** (`POST /orders`): `orderNumber` (único, até 50 caracteres),
`expectedDeliveryDate` (`YYYY-MM-DD`), `deliveryAddress`, `customer`
(`name` e `document`) e `items` (1 a 100 itens com `description` e
`price` não negativo, até duas casas decimais). O status inicial é
sempre `PENDING` e o criador é o usuário autenticado.

**Clientes por CPF/CNPJ:** o documento pode vir com ou sem pontuação; é
normalizado, validado (inclusive CNPJ alfanumérico) e define o tipo
(`PERSON` para CPF, `COMPANY` para CNPJ). Se o documento ainda não
existe, o cliente é criado; se existe com o mesmo nome, é reutilizado;
se existe com outro nome, o nome é atualizado e a resposta inclui um
aviso (`warnings`), sem tratar a operação como erro. O banco garante um
único cliente por documento, inclusive sob requisições simultâneas.

**Status** — transições permitidas:

| Atual | Próximos |
| --- | --- |
| `PENDING` | `CONFIRMED`, `CANCELED` |
| `CONFIRMED` | `IN_PREPARATION`, `CANCELED` |
| `IN_PREPARATION` | `SHIPPED`, `CANCELED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` | — (final) |
| `CANCELED` | — (final) |

Transição não permitida retorna `400` sem alterar o pedido. Reenviar o
status atual não altera nada.

**Edição** (`PATCH /orders/:id`): campos omitidos permanecem iguais;
`null` é rejeitado. `items`, quando enviado, substitui **todos** os itens
(`items: []` retorna `400`). `customer` aplica a mesma regra de CPF/CNPJ:
com outro documento, o pedido passa para esse cliente. Número duplicado
retorna `409`; pedido excluído retorna `404`.

**Exclusão lógica** (`DELETE /orders/:id`, ADMIN): preenche `deletedAt`
sem apagar o registro e retorna `204` sem corpo. O pedido some da
listagem e da consulta, não pode ser editado nem excluído de novo
(`404`), e o número continua reservado.

**Contagem de pedidos (`ordersCount`):** conta apenas pedidos ativos do
cliente. É incrementada na criação, ajustada nos dois clientes na troca
de cliente e decrementada uma única vez na exclusão, sempre na mesma
transação da operação.

**Atomicidade:** criação, edição e exclusão rodam em transação; qualquer
falha desfaz tudo (inclusive um cliente recém-criado).

## Formato das respostas

Recurso individual (com `warnings` apenas quando houver aviso):

```json
{
  "data": {
    "id": "uuid",
    "orderNumber": "PED-1001",
    "expectedDeliveryDate": "2026-11-15",
    "deliveryAddress": "Rua das Flores, 123",
    "status": "PENDING",
    "customer": { "id": "uuid", "name": "João da Silva", "document": "52998224725", "type": "PERSON" },
    "items": [{ "id": "uuid", "description": "Caixa de som", "price": "199.90" }],
    "createdById": "uuid",
    "createdAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:00:00.000Z"
  },
  "warnings": [
    { "code": "CUSTOMER_NAME_UPDATED", "message": "CPF já cadastrado. O nome do cliente foi atualizado." }
  ]
}
```

Preços são strings com duas casas (`"199.90"`) para não perder precisão.
Para CNPJ, a mensagem do aviso é "CNPJ já cadastrado. A razão social foi
atualizada.".

Listagem:

```json
{ "data": [], "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 } }
```

Erro (todas as rotas):

```json
{ "statusCode": 400, "message": ["items deve ter pelo menos um item"], "error": "BAD_REQUEST" }
```

`message` é uma lista quando há vários erros de validação.

| Código | Quando |
| --- | --- |
| `400` | Entrada inválida, CPF/CNPJ inválido, id não UUID, transição de status não permitida |
| `401` | Token ausente, inválido ou expirado; credenciais inválidas |
| `403` | Usuário sem permissão para a rota |
| `404` | Recurso inexistente ou pedido excluído |
| `409` | Número de pedido ou email duplicado |
| `500` | Erro inesperado — sem stack trace ou detalhes internos na resposta |

## Segurança em produção

- Gere um `JWT_SECRET` longo e aleatório por ambiente e guarde-o em um
  gerenciador de segredos; nunca o versione nem o coloque na imagem.
- Use credenciais próprias e fortes para o PostgreSQL; não reutilize os
  valores do `.env.example` nem os usuários do seed.
- Não execute o seed de demonstração em produção (ele se recusa com
  `NODE_ENV=production`).
- Aplique migrations com `prisma migrate deploy`, nunca `migrate dev` ou
  `db push`.
- Publique a API atrás de HTTPS (proxy reverso ou balanceador); o token
  trafega no header `Authorization`.
- O Swagger (`/api/docs`) fica disponível em todos os ambientes;
  avalie restringir o acesso a ele em produção.
- Logs de erro não incluem senhas, hashes ou tokens; respostas `500` não
  expõem detalhes internos.
- Rode `npm audit` regularmente e mantenha as dependências atualizadas.
