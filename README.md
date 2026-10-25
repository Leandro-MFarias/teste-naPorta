# naPorta

API REST e portal web para gestão de pedidos de entrega: autenticação de usuários com
primeiro acesso por senha temporária enviada por email, cadastro de
pedidos com itens, criação e reutilização automática de clientes por
CPF/CNPJ, controle de status com notificação do cliente por email e
exclusão lógica. O portal ([`frontend/`](frontend), Next.js) consome a
API: login, primeiro acesso, pedidos e cadastro de usuários.

## Estrutura do repositório

| Caminho | Conteúdo |
| --- | --- |
| [`backend/`](backend) | API NestJS (código, Prisma, testes, Dockerfile e Compose) |
| [`frontend/`](frontend) | Portal web Next.js (veja [Frontend (Next.js)](#frontend-nextjs)) |
| [`.github/workflows/`](.github/workflows) | Workflows do GitHub Actions |
| `package.json` (raiz) | Ferramentas do repositório: Husky, commitlint, Commitizen e secretlint |

O plano completo da fundação está em
[`backend/docs/PLANO_FUNDACAO.md`](backend/docs/PLANO_FUNDACAO.md).

> **Onde rodar os comandos:** salvo indicação contrária (como em
> [Hooks de git](#hooks-de-git-husky), que roda na raiz, e em
> [Frontend (Next.js)](#frontend-nextjs), que roda em `frontend/`), todos
> os comandos deste README são executados dentro de `backend/`:
>
> ```bash
> cd backend
> ```

## Sumário

- [Estrutura do repositório](#estrutura-do-repositório)
- [API First e arquitetura](#api-first-e-arquitetura)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Como instalar e rodar](#como-instalar-e-rodar)
- [Configuração (.env)](#configuração-env)
- [Execução com Docker Compose](#execução-com-docker-compose)
- [Frontend (Next.js)](#frontend-nextjs)
- [Prisma: client, migrations e seed](#prisma-client-migrations-e-seed)
- [Scripts](#scripts)
- [Testes](#testes)
- [CI e padrão de commits](#ci-e-padrão-de-commits)
- [Swagger](#swagger)
- [Autenticação](#autenticação)
- [CORS](#cors)
- [Emails](#emails)
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
    ├── auth/      # login JWT, hash de senha (Argon2id), primeiro acesso e troca de senha
    ├── users/     # cadastro de usuários (ADMIN) com senha temporária
    ├── mail/      # envio SMTP (Nodemailer) e templates de email
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
- Nodemailer (SMTP); Mailpit para capturar emails em desenvolvimento
- Vitest (testes unitários e de integração)
- Docker e Docker Compose

## Pré-requisitos

- Node.js 24 e npm
- Docker com Docker Compose v2

## Como instalar e rodar

Passo a passo do clone até o login no portal. Banco (PostgreSQL) e
Mailpit rodam no Docker; a API e o portal rodam na sua máquina. Use
dois terminais: um para a API e outro para o portal. Antes de começar,
confira os [pré-requisitos](#pré-requisitos) e deixe o Docker aberto.

### 1. Clonar o repositório

```bash
git clone https://github.com/Leandro-MFarias/teste-naPorta.git
cd teste-naPorta
```

### 2. Configurar o `.env` da API

```bash
cd backend
cp .env.example .env.development
```

O `.env.example` já vem pronto para rodar localmente, então não há nada
obrigatório para editar. Revise só estes pontos:

| Variável | Precisa mudar? |
| --- | --- |
| `JWT_SECRET` | Recomendado: troque o valor de exemplo por um aleatório, gerado com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `POSTGRES_PORT`, `PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` | Só se as portas `5432`, `3333`, `1025` ou `8025` já estiverem em uso na sua máquina. Se mudar `POSTGRES_PORT`, ajuste a porta na `DATABASE_URL` também |
| Demais variáveis | Não. Os padrões já apontam para o banco e o Mailpit do Docker e para o portal em `http://localhost:3000` |

A lista completa está em [Configuração (.env)](#configuração-env).

### 3. Instalar as dependências e preparar o banco

Ainda em `backend/`:

```bash
npm install                    # dependências da API (gera também o Prisma Client)
npm run db:up                  # sobe PostgreSQL e Mailpit no Docker
npm run prisma:migrate:deploy  # cria as tabelas
npm run prisma:seed            # cria os usuários de acesso e pedidos de exemplo
```

O seed é necessário para entrar no portal: ele cria o primeiro
administrador. Sem o seed, não existe nenhum usuário para fazer login.

### 4. Subir a API

Ainda em `backend/`:

```bash
npm run start:dev
```

Deixe este terminal aberto. A API fica em `http://localhost:3333`, e a
documentação interativa (Swagger) em `http://localhost:3333/api/docs`.

### 5. Configurar e subir o portal

Em um **segundo terminal**, a partir da raiz do repositório:

```bash
cd frontend
cp .env.example .env.local     # API_URL=http://localhost:3333, sem nada para editar
npm install
npm run dev
```

### 6. Acessar o portal

Abra `http://localhost:3000` e entre com um dos usuários criados pelo
seed:

| Papel | Email | Senha | O que pode fazer |
| --- | --- | --- | --- |
| ADMIN | `admin@example.com` | `Admin12345` | Tudo, inclusive cadastrar usuários e excluir pedidos |
| USER | `user@example.com` | `User12345` | Listar, cadastrar, editar e mudar o status de pedidos |

| Serviço | Endereço |
| --- | --- |
| Portal | `http://localhost:3000` |
| API | `http://localhost:3333` |
| Swagger | `http://localhost:3333/api/docs` |
| Mailpit (emails enviados) | `http://localhost:8025` |

### 7. Ver os emails (primeiro acesso)

Nenhum email sai para a internet: o Mailpit captura todos em
`http://localhost:8025`. Para testar o fluxo de primeiro acesso:

1. Entre como ADMIN e cadastre um usuário em **Novo usuário**.
2. Abra o Mailpit e copie a senha temporária do email de boas-vindas.
3. Saia da conta, entre com o email do novo usuário e essa senha.
4. O portal pede a troca da senha antes de liberar o restante.

Os emails de mudança de status dos pedidos também aparecem no Mailpit.

### Parar e voltar a rodar

- **Parar:** `Ctrl+C` nos dois terminais e, em `backend/`,
  `npm run db:down`. Os dados do banco ficam guardados no volume
  `postgres-data`.
- **Rodar de novo:** `npm run start:dev` em `backend/` (ele sobe o banco
  e o Mailpit sozinho) e `npm run dev` em `frontend/`. Migrations e seed
  só precisam ser repetidos quando houver migrations novas no
  repositório (`npm run prisma:migrate:deploy`).

### Problemas comuns

| Sintoma | Causa e solução |
| --- | --- |
| "Email ou senha inválidos." com o usuário do seed | O seed não rodou. Execute `npm run prisma:seed` em `backend/` |
| `npm run db:up` falha ou não conecta | O Docker não está aberto, ou a porta `5432` já está em uso (mude `POSTGRES_PORT` e a `DATABASE_URL`) |
| A API não sobe e lista variáveis inválidas | O `.env.development` não existe em `backend/`, ou há um valor inválido nele (passo 2) |
| O portal mostra "Não foi possível conectar à API." | A API não está rodando (passo 4) ou o `API_URL` do `frontend/.env.local` aponta para a porta errada |

> **Tudo em containers (alternativa):** depois do passo 2, rode
> `npm run docker:up` e `npm run docker:seed` em `backend/`. Isso sobe
> banco, Mailpit, migrations, API e portal juntos, sem `npm install`
> (veja [Execução com Docker Compose](#execução-com-docker-compose)).
> Depois siga a partir do passo 6.

> **Para contribuir:** rode também `npm install` na **raiz** do
> repositório. Isso ativa os hooks de git (veja
> [Hooks de git](#hooks-de-git-husky)). Para só rodar o projeto, não é
> preciso.

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
| `PORT` | Porta da API ao rodar localmente (padrão `3333`) |
| `API_PORT` | Porta publicada pela API no Docker Compose (padrão `3333`) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Configuram o container do PostgreSQL |
| `POSTGRES_PORT` | Porta do PostgreSQL publicada no host (padrão `5432`) |
| `DATABASE_URL` | URL de conexão usada pela aplicação local e pelo Prisma CLI |
| `JWT_SECRET` | Obrigatório, mínimo de 32 caracteres |
| `JWT_EXPIRES_IN` | Validade do token, formato `<número><s\|m\|h\|d>`; mínimo `5h` (padrão `5h`) |
| `CORS_ORIGINS` | Origens liberadas no CORS, separadas por vírgula (padrão `http://localhost:3000`); veja [CORS](#cors) |
| `FRONTEND_URL` | URL do frontend usada nos links dos emails (padrão `http://localhost:3000`; o botão de acesso leva a `<FRONTEND_URL>/login`) |
| `SMTP_HOST`, `SMTP_PORT` | Servidor SMTP (padrão `localhost:1025`, o Mailpit local) |
| `SMTP_SECURE` | `true` para TLS direto (porta 465); `false` usa STARTTLS quando o servidor oferece (padrão `false`) |
| `SMTP_USER`, `SMTP_PASSWORD` | Opcionais: credenciais do SMTP |
| `MAIL_FROM` | Remetente (padrão `naPorta <no-reply@naporta.local>`) |
| `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` | Portas do Mailpit publicadas no host (padrão `1025` e `8025`) |
| `TEST_DATABASE_URL` | Opcional: banco dos testes de integração (nome deve terminar em `_test`) |

As variáveis são validadas na inicialização: valores ausentes ou
inválidos impedem a aplicação de subir. Arquivos `.env` e `.env.*`
(exceto `.env.example`) não são versionados.

## Execução com Docker Compose

Sobe PostgreSQL e Mailpit, aplica as migrations e sobe a API em
container:

```bash
npm run docker:up      # build das imagens + db + mailpit + migrate + api + web
npm run docker:seed    # opcional: seed dentro do container
npm run docker:down    # para e remove os containers (o volume é mantido)
```

- A API fica em `http://localhost:${API_PORT}` (padrão `3333`) e o
  portal em `http://localhost:${WEB_PORT}` (padrão `3000`). Não rode
  `start:dev` ou `npm run dev` do frontend ao mesmo tempo nas mesmas
  portas.
- O serviço `web` (imagem de `frontend/Dockerfile`) chama a API pela rede
  do Compose (`http://api:3333`) e só sobe depois que a API está
  saudável.
- O serviço `migrate` executa `prisma migrate deploy` e termina; a API
  só sobe depois que ele conclui com sucesso.
- Dentro do Compose a API envia emails pelo host `mailpit` (porta 1025)
  e só sobe depois que ele está saudável.
- Dentro do Compose a API conecta no host `db`; a `DATABASE_URL` é
  montada a partir das variáveis `POSTGRES_*` (use uma senha sem
  caracteres que precisem de escape em URL, ou ajuste o `compose.yaml`).
- A imagem da API (`Dockerfile`, estágio `runtime`) roda como usuário
  sem privilégios, com `NODE_ENV=production`, healthcheck em `/health` e
  nenhum segredo embutido: tudo chega por variável de ambiente.
- `npm run db:up` sobe apenas o PostgreSQL e o Mailpit; a API, o
  `migrate` e o `web` pertencem ao profile `app` do Compose.

## Frontend (Next.js)

Portal em [`frontend/`](frontend): Next.js 16 (App Router, Cache
Components), React 19, TypeScript e Tailwind CSS 4. O visual segue o
template de email: laranja da marca (`#EE6F16`) e suas variações, com os
tons escuros do card na barra lateral. Comandos desta seção rodam em
`frontend/`.

```bash
cp .env.example .env.local   # API_URL (padrão http://localhost:3333)
npm install
npm run dev                  # http://localhost:3000 (API rodando na 3333)
```

| Rota | Quem acessa | O que faz |
| --- | --- | --- |
| `/login` | Público | Login; volta para a página pedida (`?next=`) |
| `/primeiro-acesso` | Logado com senha temporária | Troca obrigatória da senha recebida por email |
| `/pedidos` | ADMIN e USER | Listagem com filtros (número, status, período) e paginação na URL |
| `/pedidos/novo` | ADMIN e USER | Cadastro com itens dinâmicos, máscara e validação de CPF/CNPJ e total |
| `/pedidos/[id]` | ADMIN e USER | Detalhe, linha do tempo e mudança de status; exclusão só para ADMIN |
| `/pedidos/[id]/editar` | ADMIN e USER | Edição (os itens enviados substituem os atuais) |
| `/usuarios/novo` | ADMIN | Cadastro de usuário (senha temporária enviada por email) |
| `/perfil` | ADMIN e USER | Dados da conta e troca de senha |

- **Sessão:** o login roda em uma Server Action, que guarda o access
  token em um cookie `httpOnly` (`sameSite=lax`, `secure` em produção,
  validade igual à do token). O JavaScript do navegador nunca lê o
  token, e o navegador nunca chama a API: Server Components e Server
  Actions chamam a API pelo servidor do Next.js (`API_URL`). Por isso o
  frontend não depende do CORS da API.
- `src/proxy.ts` redireciona para `/login` quem não tem o cookie (checagem
  otimista); a validação real é feita pela API em cada chamada. Resposta
  401 encerra a sessão (`/sair`) e 403 de senha pendente leva a
  `/primeiro-acesso`.
- Avisos da API (`warnings`, ex.: nome do cliente atualizado) aparecem
  no detalhe do pedido depois de criar ou editar. Erros de validação
  aparecem no campo correspondente.
- Docker: `frontend/Dockerfile` gera a imagem standalone (usuário sem
  root, healthcheck em `/login`); no Compose é o serviço `web`.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção (standalone) e execução |
| `npm run typecheck` | Gera os tipos das rotas e roda `tsc --noEmit` |
| `npm run lint` / `lint:check` | ESLint (com e sem `--fix`) |
| `npm run format` / `format:check` | Prettier (com e sem escrita) |

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
já existe são ignorados. Os usuários do seed não passam pelo primeiro
acesso (não precisam trocar a senha), os clientes recebem emails
fictícios `@example.com` (clientes do seed ainda sem email são
preenchidos) e nenhum email é enviado. O seed se recusa a rodar com
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
| `format` / `format:check` | Prettier em `src/`, `test/` e `prisma/` / apenas verificação |
| `typecheck` | Verificação de tipos (`tsc --noEmit`) |
| `test` | Testes unitários (`vitest run`) |
| `test:watch` | Testes unitários em modo watch |
| `test:cov` | Testes unitários com cobertura (`coverage/`) |
| `test:integration` | Testes de integração (`vitest.config.integration.ts`) |
| `db:up` / `db:down` | Sobe / para o PostgreSQL e o Mailpit do Compose |
| `docker:up` / `docker:down` | Sobe / para banco, Mailpit, migrations e API em containers |
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
  guards, validações, CPF/CNPJ, transições de status, mapeamentos,
  templates de email, geração de senha temporária e rotas HTTP com
  dependências substituídas por mocks.
- **Integração** (`*.integration-spec.ts`): sobem o `AppModule` completo
  e fazem requisições HTTP reais contra um PostgreSQL de verdade —
  transações e rollback, concorrência na criação de clientes, unicidade
  do número do pedido, `ordersCount`, exclusão lógica, filtros,
  paginação, autenticação/autorização, primeiro acesso, emails enviados
  (cadastro de usuário, pedido e status) e idempotência do seed.

Nenhum teste envia email de verdade: o envio SMTP é substituído por uma
implementação em memória que guarda as mensagens para conferência.

Os testes de integração **nunca usam o banco de desenvolvimento**. Eles
usam `TEST_DATABASE_URL` ou, por padrão, o banco da `DATABASE_URL` com o
sufixo `_test` (ex.: `local_db_test`) no mesmo servidor. O banco é criado
se não existir, recebe as migrations (`prisma migrate deploy`) e tem as
tabelas apagadas antes de cada teste. Qualquer banco cujo nome não
termine em `_test` é recusado. Os arquivos rodam em série.

## CI e padrão de commits

### GitHub Actions

Os workflows ficam em `.github/workflows/` (na raiz do repositório) e
rodam em todo **pull request para a `main`** e em todo **push na
`main`**. Cada job é uma verificação independente:

| Workflow | Job (nome do check) | O que verifica |
| --- | --- | --- |
| Automated Tests | `Unit Tests (backend)` | `npm test` |
| Automated Tests | `Integration Tests (backend)` | `npm run test:integration` contra um PostgreSQL 18 descartável |
| Linting | `Prettier (backend)` | `npm run format:check` |
| Linting | `ESLint (backend)` | `npm run lint:check` |
| Linting | `TypeScript (backend)` | `npm run typecheck` |
| Linting | `Prettier (frontend)` | `npm run format:check` em `frontend/` |
| Linting | `ESLint (frontend)` | `npm run lint:check` em `frontend/` |
| Linting | `TypeScript (frontend)` | `npm run typecheck` em `frontend/` |
| Automated Tests | `Build (frontend)` | `npm run build` em `frontend/` |
| Linting | `Commitlint` | Mensagens dos commits da PR (ou do push) no padrão Conventional Commits |
| Security | `Secretlint` | Segredos nos arquivos versionados |
| Security | `npm audit` | Vulnerabilidades altas ou críticas nas dependências (raiz, backend e frontend) |

Todos usam a versão do Node definida em `.nvmrc` e instalam dependências
com `npm ci` (versões exatas do `package-lock.json`). Nenhum workflow
precisa de segredos: os testes de integração usam um banco criado no
próprio job e um envio de email falso.

**Bloquear merge e push na `main`:** em *Settings → Rules → Rulesets →
New branch ruleset*, com alvo na branch `main`, ative **Require a pull
request before merging** e **Require status checks to pass**, e adicione
os 12 checks da tabela acima. Assim nenhum push direto entra na `main`
e o merge só é liberado com todos os checks verdes. O fluxo de trabalho
é: commitar na branch `stage`, abrir a PR `stage → main` e fazer o
merge pelo GitHub.

Se o GitHub Actions não disparar em uma PR (instabilidade), feche e
reabra a PR ou envie um novo commit (`git commit --amend --date=now` e
`git push --force-with-lease` reaproveitam o último commit).

### Hooks de git (Husky)

As ferramentas de repositório ficam no `package.json` da **raiz**. Rode
uma vez, na raiz, depois de clonar:

```bash
npm install   # instala as ferramentas e ativa os hooks (script prepare)
```

| Hook | O que faz |
| --- | --- |
| `pre-commit` | `lint-staged` nos arquivos staged: `secretlint` em todos; no backend e no frontend, também `prettier --write` e `eslint --fix` nos `.ts`/`.tsx` |
| `commit-msg` | `commitlint`: recusa mensagens fora do padrão |

- **Padrão de commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`,
  `build:`, `perf:`, `style:`, `revert:`), configurado em
  `commitlint.config.mjs`. Um commit por mudança lógica.
- `npm run commit` (na raiz) abre o assistente do Commitizen para montar
  a mensagem escolhendo o tipo.
- `npm run lint:secrets` (na raiz) varre todo o repositório com o
  secretlint; `npm run lint:commits` valida o último commit.
- **Segredos:** o secretlint (`.secretlintrc.json`) usa as regras
  recomendadas (tokens, chaves privadas, connection strings com senha
  etc.) e bloqueia `JWT_SECRET` ou `SMTP_PASSWORD` preenchidos em
  arquivos versionados. Só são liberados o placeholder do `.env.example`
  e a URL do banco local de desenvolvimento.
- `git commit -n` pula os hooks localmente, mas o CI faz as mesmas
  verificações e bloqueia o merge.

## Swagger

Com a API rodando:

- Interface: `http://localhost:3333/api/docs`
- Especificação OpenAPI (JSON): `http://localhost:3333/api/docs-json`

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
    "user": { "id": "...", "name": "...", "email": "admin@example.com", "role": "ADMIN", "isActive": true, "mustChangePassword": false, "createdAt": "...", "updatedAt": "..." }
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
- `GET /auth/me` retorna o usuário autenticado.

### Primeiro acesso

1. O ADMIN cadastra o usuário (`POST /users`, sem senha). A API gera
   uma senha temporária aleatória e a envia no email de boas-vindas,
   junto com o botão **Acessar o sistema** (`<FRONTEND_URL>/login`).
2. O usuário faz login com a senha temporária. A resposta traz
   `user.mustChangePassword: true`.
3. Enquanto não trocar a senha, todas as rotas retornam
   `403 "Troque a senha temporária antes de continuar."`, exceto
   `GET /auth/me` e `POST /auth/change-password`.
4. Troca de senha:

   ```http
   POST /auth/change-password
   Authorization: Bearer <accessToken>
   Content-Type: application/json

   { "currentPassword": "<senha temporária>", "newPassword": "MinhaSenha123" }
   ```

   Retorna `200` com o usuário (`mustChangePassword: false`). O mesmo
   token passa a valer em todas as rotas, e a senha temporária deixa de
   funcionar. Senha atual incorreta retorna
   `400 "Senha atual incorreta."`; nova senha igual à atual retorna
   `400 "A nova senha deve ser diferente da senha atual."`. A nova senha
   segue a política: 8 a 128 caracteres, com ao menos uma letra e um
   número.

A troca de senha também pode ser usada a qualquer momento por usuários
que já concluíram o primeiro acesso. A senha temporária não expira, mas
só serve para o primeiro login.

## CORS

A API roda na porta `3333` para deixar a `3000` livre para o frontend
Next.js. Navegadores só permitem que um site chame a API se a origem
dele estiver liberada no CORS. **Por padrão, apenas
`http://localhost:3000` (o Next.js local) está liberado.**

**Para liberar outros sites** (o portal em produção, um ambiente de
homologação, outra porta local), informe todas as origens em
`CORS_ORIGINS`, separadas por vírgula, e reinicie a API:

```dotenv
CORS_ORIGINS=http://localhost:3000,https://portal.naporta.com.br
```

- Cada item é uma origem exata: protocolo + domínio + porta, sem
  caminho (`https://portal.naporta.com.br`, não
  `https://portal.naporta.com.br/app`). `*` não é aceito.
- `http://localhost:3000` e `http://127.0.0.1:3000` são origens
  diferentes.
- Ao definir `CORS_ORIGINS`, a lista substitui o padrão: inclua
  `http://localhost:3000` se ainda quiser o frontend local.
- No Docker Compose a variável é repassada à API a partir do arquivo de
  ambiente (`--env-file`).
- Valor inválido impede a API de subir, com erro indicando
  `CORS_ORIGINS`.
- São liberados os métodos `GET`, `POST`, `PATCH` e `DELETE` e os headers
  `Content-Type` e `Authorization`. Cookies não são usados (o token vai no
  header), então `credentials` fica desabilitado.
- O CORS vale apenas para navegadores; ferramentas como curl, Postman ou
  outro backend não são afetadas. O portal em `frontend/` chama a API
  pelo servidor do Next.js, então também não depende do CORS; ele
  continua útil para clientes que chamem a API direto do navegador.

## Emails

Os emails são enviados por SMTP (Nodemailer), em HTML com layout escuro
e marca em texto "naPorta", sempre com uma versão em texto puro. Em
desenvolvimento, o [Mailpit](https://mailpit.axllent.org/) (serviço
`mailpit` do Compose) captura tudo sem entregar a ninguém: abra
`http://localhost:8025` para ver as mensagens.

| Email | Destinatário | Quando |
| --- | --- | --- |
| Boas-vindas com senha temporária | Usuário cadastrado | `POST /users` |
| Pedido recebido | Cliente | Pedido criado (o texto muda se o cliente acabou de ser cadastrado) |
| Pedido recebido (vinculado ao cliente) | Novo cliente | `PATCH` troca o cliente do pedido |
| Status atualizado | Cliente | `PATCH` muda o status (status anterior e novo) |

- Os emails de pedido trazem número, status, previsão de entrega,
  endereço, itens com preço e total.
- **Boas-vindas:** se o envio falhar, o cadastro é cancelado (o usuário
  não é criado) e a API retorna
  `503 "Não foi possível enviar o email de boas-vindas. O usuário não foi cadastrado; tente novamente."`.
- **Pedidos:** os emails saem depois que a operação é confirmada no
  banco, em segundo plano. Uma falha de envio não desfaz nem atrasa o
  pedido; é registrada no log com o número do pedido (sem o email do
  cliente).
- Não há email quando: a edição não muda o status nem o cliente,
  o status reenviado é o atual, a operação falha, o pedido é excluído,
  ou o cliente não tem email (clientes antigos, anteriores a este campo).
- Na troca de cliente, só o novo cliente é avisado (com o pedido no
  status atual, mesmo que o status também tenha mudado); o cliente
  anterior não recebe email.

> **Importante:** com a configuração padrão, **nenhum email chega de
> verdade à caixa de entrada**, nem para endereços reais (ex.: Gmail):
> todos ficam retidos no Mailpit. Para testar o fluxo localmente não é
> preciso nenhuma conta; qualquer email serve e a mensagem (com a senha
> temporária) aparece em `http://localhost:8025`.
>
> **Para entregar emails de verdade é obrigatório configurar uma conta
> SMTP válida** (Gmail com senha de app, Amazon SES, SendGrid, Resend,
> Brevo etc.) nas variáveis `SMTP_*`:
>
> ```dotenv
> SMTP_HOST=smtp.seu-provedor.com
> SMTP_PORT=587
> SMTP_SECURE=false          # true se usar a porta 465
> SMTP_USER=usuario-do-smtp
> SMTP_PASSWORD=senha-ou-chave-do-smtp
> MAIL_FROM=naPorta <no-reply@seu-dominio.com>
> ```
>
> Use em `MAIL_FROM` um remetente autorizado no provedor (domínio com
> SPF/DKIM), senão os emails podem ser recusados ou ir para o spam. Sem
> SMTP válido, o `POST /users` retorna `503` e o usuário não é
> cadastrado. No Docker Compose, a API usa o Mailpit; para usar um
> provedor real ali, ajuste `SMTP_*` do serviço `api` no `compose.yaml`.

## Endpoints e permissões

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Autentica e retorna o token | Público |
| `GET` | `/auth/me` | Usuário autenticado | Autenticado (inclusive no primeiro acesso) |
| `POST` | `/auth/change-password` | Troca a senha e conclui o primeiro acesso | Autenticado (inclusive no primeiro acesso) |
| `GET` | `/health` | Saúde da API e do banco (200 ou 503) | Público |
| `POST` | `/users` | Cadastra usuário e envia a senha temporária por email | ADMIN |
| `POST` | `/orders` | Cria pedido | ADMIN, USER |
| `GET` | `/orders` | Lista pedidos ativos com filtros e paginação | ADMIN, USER |
| `GET` | `/orders/:id` | Consulta pedido ativo | ADMIN, USER |
| `PATCH` | `/orders/:id` | Edita pedido ativo | ADMIN, USER |
| `DELETE` | `/orders/:id` | Exclusão lógica | ADMIN |

Não há rotas próprias de clientes: eles são geridos pelas operações de
pedido. Sem token, rotas protegidas retornam `401`; com papel
insuficiente, ou antes de trocar a senha temporária, `403`.

### Usuários

`POST /users` recebe `name`, `email` (gravado em minúsculas, único) e
`role` (`ADMIN` ou `USER`). **Não recebe senha** (enviar `password`
retorna `400`): a API gera uma senha temporária aleatória de 16
caracteres, grava apenas o hash Argon2id e a envia no email de
boas-vindas. O usuário nasce com `mustChangePassword: true` e conclui o
cadastro no [primeiro acesso](#primeiro-acesso). Email já cadastrado
retorna `409` (sem enviar email); falha no envio do email retorna `503`
e o usuário não é criado.

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
(`name`, `document` e `email`, todos obrigatórios) e `items` (1 a 100 itens com `description` e
`price` não negativo, até duas casas decimais). O status inicial é
sempre `PENDING` e o criador é o usuário autenticado.

**Clientes por CPF/CNPJ:** o documento pode vir com ou sem pontuação; é
normalizado, validado (inclusive CNPJ alfanumérico) e define o tipo
(`PERSON` para CPF, `COMPANY` para CNPJ). Se o documento ainda não
existe, o cliente é criado; se existe com o mesmo nome e email, é
reutilizado; se existe com outro nome ou outro email, os dados são
atualizados e a resposta inclui um aviso (`warnings`) para cada campo
alterado, sem tratar a operação como erro. O email é gravado em
minúsculas; um cliente antigo sem email recebe o informado sem aviso.
O banco garante um único cliente por documento, inclusive sob
requisições simultâneas. O cliente recebe emails do pedido (veja
[Emails](#emails)).

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
    "customer": { "id": "uuid", "name": "João da Silva", "document": "52998224725", "email": "joao@example.com", "type": "PERSON" },
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
`customer.email` é `null` apenas em clientes antigos, cadastrados antes
do campo existir.

| Código do aviso | CPF | CNPJ |
| --- | --- | --- |
| `CUSTOMER_NAME_UPDATED` | "CPF já cadastrado. O nome do cliente foi atualizado." | "CNPJ já cadastrado. A razão social foi atualizada." |
| `CUSTOMER_EMAIL_UPDATED` | "CPF já cadastrado. O email do cliente foi atualizado." | "CNPJ já cadastrado. O email da empresa foi atualizado." |

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
| `403` | Usuário sem permissão para a rota; senha temporária ainda não trocada |
| `404` | Recurso inexistente ou pedido excluído |
| `409` | Número de pedido ou email duplicado |
| `500` | Erro inesperado — sem stack trace ou detalhes internos na resposta |
| `503` | Email de boas-vindas não enviado (usuário não criado); banco indisponível em `/health` |

## Segurança em produção

- Gere um `JWT_SECRET` longo e aleatório por ambiente e guarde-o em um
  gerenciador de segredos; nunca o versione nem o coloque na imagem.
- Use credenciais próprias e fortes para o PostgreSQL; não reutilize os
  valores do `.env.example` nem os usuários do seed.
- Não execute o seed de demonstração em produção (ele se recusa com
  `NODE_ENV=production`).
- Aplique migrations com `prisma migrate deploy`, nunca `migrate dev` ou
  `db push`.
- Libere em `CORS_ORIGINS` somente os domínios reais do portal, com
  `https://`.
- Configure um SMTP real com TLS (`SMTP_SECURE=true` na porta 465, ou
  STARTTLS na 587), credenciais em gerenciador de segredos e
  `FRONTEND_URL` com o endereço `https://` do portal. O Mailpit é apenas
  para desenvolvimento.
- A senha temporária só existe no email de boas-vindas: nunca é gravada
  em texto puro, retornada pela API ou registrada em log.
- Publique a API atrás de HTTPS (proxy reverso ou balanceador); o token
  trafega no header `Authorization`.
- O Swagger (`/api/docs`) fica disponível em todos os ambientes;
  avalie restringir o acesso a ele em produção.
- Logs de erro não incluem senhas, hashes, tokens nem emails de
  clientes; respostas `500` não expõem detalhes internos.
- Rode `npm audit` regularmente e mantenha as dependências atualizadas.
