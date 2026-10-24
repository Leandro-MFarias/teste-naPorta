# PLANO_FUNDAÇÃO.md --- API naPorta

## 1. Objetivo

Construir a fundação técnica da API do sistema **naPorta**, uma API REST
para gerenciamento de pedidos, clientes e usuários internos.

Este documento é o plano de implementação para o Claude. Ele define as
tecnologias, arquitetura, regras de negócio, contratos HTTP, segurança,
persistência, testes e critérios de conclusão. Siga as decisões
descritas aqui; não invente funcionalidades fora do escopo nem altere
regras de negócio sem solicitar confirmação.

## 2. Princípio central: API First

O projeto deve ser **API First**.

-   A API é o contrato central do produto e deve ser desenvolvida antes
    de qualquer frontend.
-   Toda regra de negócio deve ficar no backend, sem depender de telas
    ou de um cliente específico.
-   Os contratos HTTP, DTOs, validações, códigos de resposta e
    documentação Swagger devem ser definidos e mantidos de forma
    consistente.
-   A API deve poder ser consumida por um portal web, aplicativo ou
    outro cliente sem alterações nas regras de negócio.
-   A documentação OpenAPI/Swagger deve refletir os contratos reais da
    API e estar disponível em `/api/docs`.
-   Não criar frontend nesta etapa. Preparar uma API bem documentada e
    desacoplada para que um frontend possa ser desenvolvido
    posteriormente.
-   Não colocar regras de autorização, validação ou cálculo
    exclusivamente no frontend.

## 3. Tecnologias obrigatórias

-   **Runtime:** Node.js LTS (24 ou superior).
-   **Framework:** NestJS 12.
-   **Linguagem:** TypeScript com modo estrito habilitado.
-   **Sistema de módulos:** ESM (`"type": "module"` no `package.json`,
    `module`/`moduleResolution` como `nodenext` no `tsconfig.json`).
    Imports relativos devem usar a extensão `.js`
    (ex.: `import { AppModule } from './app.module.js'`).
-   **Banco de dados:** PostgreSQL.
-   **ORM:** Prisma.
-   **Autenticação:** JWT Bearer.
-   **Hash de senha:** Argon2id (pacote `argon2`), com os parâmetros
    recomendados pela OWASP: 19 MiB de memória, 2 iterações e
    paralelismo 1.
-   **Testes:** Vitest (ver seção 17).
-   **Validação:** `class-validator` e `class-transformer`, integrados
    ao NestJS.
-   **Documentação:** Swagger/OpenAPI com `@nestjs/swagger`.
-   **Ambiente local:** Docker e Docker Compose.
-   **Qualidade:** ESLint e Prettier.

Não adicionar arquitetura serverless, filas, cache, microsserviços ou
outras tecnologias sem necessidade demonstrada. O objetivo é uma base
limpa, testável e sem complexidade desnecessária.

## 4. Arquitetura e organização

Organizar o código por módulos de domínio do NestJS, com
responsabilidades claras:

``` text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── decorators/
│   ├── interceptors/
│   └── interfaces/
├── config/
├── prisma/
│   └── prisma.module.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   └── orders/
└── ...
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
test/
```

A estrutura exata pode ser ajustada às convenções do NestJS, mas deve
manter separação de responsabilidades:

-   **Controllers:** recebem requisições HTTP e retornam respostas; não
    devem conter regras de negócio.
-   **DTOs:** validam e documentam os dados de entrada.
-   **Services:** implementam as regras de negócio e coordenam
    transações.
-   **Interfaces de request/response:** descrevem os contratos
    TypeScript solicitados.
-   **PrismaService:** centraliza o acesso ao Prisma e ao banco.
-   **Guards/decorators:** implementam autenticação JWT e autorização
    por papel.
-   **Exception filter global:** padroniza respostas de erro.
-   **Módulos:** encapsulam funcionalidades e dependências.

Evitar abstrações e padrões genéricos sem benefício concreto. Não é
obrigatório criar repositories personalizados se o service e o Prisma
forem suficientes; se uma camada de repositório for criada, ela deve ter
uma finalidade clara e ser aplicada consistentemente.

## 5. Configuração e variáveis de ambiente

Criar `.env.example` com as variáveis necessárias, sem segredos reais.
Validar as variáveis na inicialização da aplicação.

Os valores locais ficam em arquivos por ambiente, `.env.<NODE_ENV>`
(ex.: `.env.development`). A aplicação e o Prisma CLI carregam
`.env.<NODE_ENV>` (padrão `development`) e depois `.env`; variáveis já
definidas no ambiente têm prioridade. O `compose.yaml` recebe o mesmo
arquivo via `--env-file`.

Variáveis esperadas, no mínimo:

``` dotenv
NODE_ENV=development
PORT=3333
POSTGRES_USER=local_user
POSTGRES_PASSWORD=local_password
POSTGRES_DB=local_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://local_user:local_password@localhost:5432/local_db?schema=public
JWT_SECRET=replace-with-a-long-random-secret-of-at-least-32-chars
JWT_EXPIRES_IN=5h
CORS_ORIGINS=http://localhost:3000
```

As variáveis `POSTGRES_*` configuram o container do banco; a aplicação
usa apenas `DATABASE_URL`.

Regras:

-   Nunca commitar arquivos `.env`/`.env.*` (exceto `.env.example`) ou
    segredos reais.
-   Nunca usar um segredo JWT fixo no código.
-   Validar que `JWT_SECRET` está configurado em ambientes que exigem
    autenticação.
-   A validade configurada do access token deve ser **de pelo menos 5
    horas**. O padrão será `5h`; configurações maiores são permitidas,
    mas valores menores devem ser rejeitados.
-   Documentar as variáveis no README.
-   A API usa a porta `3333` por padrão, deixando a `3000` para o
    frontend Next.js.
-   `CORS_ORIGINS` lista, separadas por vírgula, as origens liberadas no
    CORS (padrão `http://localhost:3000`, o frontend local). Outros sites
    precisam ser incluídos nessa variável; o README documenta como.
-   Não registrar senhas, hashes, tokens ou segredos em logs.

## 6. Modelo de dados

Usar PostgreSQL com Prisma e migrations versionadas. Todos os
identificadores principais podem usar UUID.

### 6.1 User

Campos mínimos:

-   `id`
-   `name`
-   `email` --- único e normalizado para evitar duplicidades por
    diferença de maiúsculas/minúsculas.
-   `passwordHash` --- nunca armazenar senha em texto puro.
-   `role` --- enum `ADMIN` ou `USER`.
-   `isActive` --- indica se o usuário pode autenticar.
-   `createdAt`
-   `updatedAt`

Não retornar `password` nem `passwordHash` em nenhuma resposta da API.

### 6.2 Customer

Campos mínimos:

-   `id`
-   `name`
-   `document` --- CPF (pessoa física) ou CNPJ (pessoa jurídica)
    normalizado, sem pontuação, e único.
-   `type` --- enum `PERSON` (CPF, 11 dígitos) ou `COMPANY` (CNPJ, 14
    caracteres), definido automaticamente a partir do documento; não é
    informado pelo cliente da API.
-   `ordersCount` --- contagem persistida de pedidos ativos, não
    excluídos logicamente.
-   `createdAt`
-   `updatedAt`

Regras:

-   Não implementar CRUD público ou endpoints independentes de clientes
    nesta etapa.
-   Clientes são criados ou reutilizados automaticamente durante a
    criação/edição de pedidos.
-   Validar o documento como CPF ou CNPJ, incluindo dígitos
    verificadores, antes de persistir. Documento que não for CPF nem
    CNPJ válido é rejeitado.
-   Aceitar o CNPJ alfanumérico da Receita Federal (12 caracteres
    alfanuméricos + 2 dígitos verificadores), além do numérico.
-   Remover pontuação e espaços do documento (e converter letras para
    maiúsculas) antes de procurar, validar e armazenar.
-   A restrição de unicidade do documento deve existir no banco de dados.
    Lidar com conflitos de concorrência sem criar clientes duplicados.

### 6.3 Order

Campos mínimos:

-   `id`
-   `orderNumber` --- único, inclusive quando o pedido estiver excluído
    logicamente.
-   `expectedDeliveryDate`
-   `deliveryAddress`
-   `status`
-   `customerId`
-   `createdById`
-   `createdAt`
-   `updatedAt`
-   `deletedAt` --- nulo enquanto o pedido estiver ativo; preenchido na
    exclusão lógica.

Relacionamentos:

-   Um cliente pode ter vários pedidos.
-   Cada pedido pertence a um cliente.
-   Cada pedido registra o usuário que o criou.
-   Um pedido contém vários itens.

A relação de cliente deve ser retornada nas respostas de pedido com os
dados necessários, sem expor informações internas. O endereço de entrega
fica registrado no pedido como dado próprio daquele pedido.

### 6.4 OrderItem

Campos mínimos:

-   `id`
-   `orderId`
-   `description`
-   `price`

Usar `Decimal` no Prisma/PostgreSQL para valores monetários. **Não usar
`float` ou `double` para representar preços.** Validar que os preços são
numéricos e não negativos.

## 7. Status e transições de pedido

Usar exatamente estes seis status:

-   `PENDING`
-   `CONFIRMED`
-   `IN_PREPARATION`
-   `SHIPPED`
-   `DELIVERED`
-   `CANCELED`

Transições permitidas:

  Status atual       Próximos status permitidos
  ------------------ ------------------------------
  `PENDING`          `CONFIRMED`, `CANCELED`
  `CONFIRMED`        `IN_PREPARATION`, `CANCELED`
  `IN_PREPARATION`   `SHIPPED`, `CANCELED`
  `SHIPPED`          `DELIVERED`
  `DELIVERED`        Nenhum
  `CANCELED`         Nenhum

-   Validar transições na camada de serviço, nunca apenas no frontend.
-   Uma transição inválida retorna `400 Bad Request` e não altera o
    pedido.
-   `DELIVERED` e `CANCELED` são estados finais.
-   A criação de um pedido usa `PENDING` como status inicial.
-   Não adicionar outros status.

## 8. Autenticação e autorização

### 8.1 Login e JWT

Implementar `POST /auth/login`.

-   Receber email e senha.
-   Verificar se o usuário existe, está ativo e a senha corresponde ao
    hash armazenado.
-   Retornar um access token JWT com validade mínima de cinco horas.
-   O token será enviado nas rotas protegidas usando:

``` http
Authorization: Bearer <token>
```

-   O payload deve conter apenas o necessário, por exemplo `sub` com o
    ID do usuário e `role`.
-   Nunca incluir senha ou hash no token.
-   Não implementar refresh token nesta versão.
-   Retornar erro de autenticação sem revelar se foi o email ou a senha
    que estava incorreto.
-   Usuários inativos não podem autenticar.

Formato esperado de sucesso do login:

``` json
{
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": 18000,
    "user": {
      "id": "uuid",
      "name": "Usuário Exemplo",
      "email": "usuario@example.com",
      "role": "USER",
      "isActive": true,
      "createdAt": "2026-10-21T12:00:00.000Z",
      "updatedAt": "2026-10-21T12:00:00.000Z"
    }
  }
}
```

`expiresIn` é expresso em segundos e deve corresponder à validade
efetiva do token.

### 8.2 Papéis e permissões

Existem dois papéis:

-   `ADMIN`
-   `USER`

Matriz de permissões:

  Operação                                     ADMIN   USER
  ------------------------------------------ ------- ------
  Criar pedido                                   Sim    Sim
  Listar e filtrar todos os pedidos ativos       Sim    Sim
  Consultar pedido ativo por ID                  Sim    Sim
  Editar pedido ativo                            Sim    Sim
  Excluir pedido logicamente                     Sim    Não
  Cadastrar usuário                              Sim    Não

O acesso aos pedidos é compartilhado: um usuário pode consultar e editar
pedidos criados por outro usuário. `createdById` é mantido para
auditoria, não para restringir consultas.

Aplicar guards de autenticação e autorização nas rotas correspondentes.
Uma chamada sem token válido retorna `401`; um usuário autenticado sem
permissão retorna `403`.

## 9. Contratos de User: Request, Response e DTOs

Criar interfaces TypeScript distintas para requests e responses de
usuário. As interfaces não substituem a validação de runtime; usar DTOs
com decorators do `class-validator` e documentá-los com Swagger.

Estrutura sugerida:

``` text
src/modules/users/
├── interfaces/
│   ├── user-request.interface.ts
│   └── user-response.interface.ts
├── dto/
│   ├── create-user.dto.ts
│   └── ...
├── users.controller.ts
├── users.service.ts
└── users.module.ts
```

### 9.1 UserRequest

A criação de usuário recebe senha no request:

``` typescript
export interface UserRequest {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
}
```

O endpoint de criação é exclusivo para `ADMIN`; não existe cadastro
público. O papel solicitado deve ser validado contra os valores
permitidos. A senha precisa cumprir uma política mínima documentada e
ser transformada em hash (Argon2id) antes de persistir.

Política de senha: de 8 a 128 caracteres, com pelo menos uma letra e um
número. O Argon2id não trunca a senha; o limite de 128 apenas evita
custo excessivo com entradas enormes.

### 9.2 UserResponse

``` typescript
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

A response não deve conter `password` nem `passwordHash`. Construir
explicitamente o objeto público de resposta; não retornar diretamente o
objeto completo do Prisma.

### 9.3 LoginRequest e LoginResponse

Criar contratos separados para autenticação:

``` typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserResponse;
}
```

Aplicar a mesma regra de não exposição de credenciais em todos os
endpoints.

## 10. Regras de negócio de clientes e pedidos

### 10.1 Criar ou reutilizar cliente por documento (CPF/CNPJ)

Ao criar um pedido:

1.  Receber os dados do cliente necessários no request do pedido,
    incluindo nome e documento (CPF ou CNPJ).
2.  Normalizar e validar o documento e definir o tipo (`PERSON`/`COMPANY`).
3.  Procurar cliente pelo documento normalizado.
4.  Se não existir, criar o cliente.
5.  Se existir com o mesmo nome, reutilizar o cliente sem criar
    duplicata.
6.  Se existir com nome diferente, atualizar o nome do cadastro do
    cliente e retornar um aviso de negócio na resposta.
7.  Criar o pedido associado ao cliente e criar os itens.
8.  Incrementar `ordersCount` do cliente.
9.  Executar as operações relacionadas em uma única transação.

O banco deve impor unicidade do documento; a lógica da aplicação deve lidar
com requisições concorrentes de forma segura.

O aviso de divergência de nome é um **warning**, não um erro. Exemplo
ilustrativo:

``` json
{
  "data": {
    "id": "uuid",
    "orderNumber": "PED-1001",
    "status": "PENDING"
  },
  "warnings": [
    {
      "code": "CUSTOMER_NAME_UPDATED",
      "message": "CPF já cadastrado. O nome do cliente foi atualizado."
    }
  ]
}
```

A mensagem varia com o tipo do cliente:

-   `PERSON` (CPF): "CPF já cadastrado. O nome do cliente foi
    atualizado."
-   `COMPANY` (CNPJ): "CNPJ já cadastrado. A razão social foi
    atualizada."

A estrutura final de `data` deve seguir o contrato completo de pedido.
Incluir `warnings` apenas quando houver aviso.

### 10.2 Editar cliente durante a edição do pedido

A edição flexível permite atualizar os dados do cliente do pedido.
Reutilizar a regra de normalização/validação de documento e de busca por documento.
Não criar endpoints independentes de CRUD de clientes.

Ao trocar o cliente associado a um pedido, recalcular a contagem de
pedidos ativos dos clientes envolvidos dentro da mesma transação:
decrementar o cliente anterior e incrementar o novo, sem permitir
contagens negativas ou inconsistentes. Se o documento for o mesmo e o nome for
diferente, atualizar o cadastro e incluir o warning apropriado.

### 10.3 Contagem de pedidos ativos

`Customer.ordersCount` conta apenas pedidos não excluídos logicamente.

-   Na criação de pedido: incrementar uma vez.
-   Na exclusão lógica de pedido ativo: decrementar uma vez.
-   Se um pedido já estiver excluído, não permitir uma segunda exclusão
    nem decrementar novamente.
-   Na troca do cliente de um pedido ativo: decrementar o cliente
    anterior e incrementar o novo.
-   Atualizações de pedido, cliente e contagem devem ocorrer na mesma
    transação.
-   Garantir que a contagem não fique negativa.
-   A contagem não inclui pedidos com `deletedAt` preenchido.

### 10.4 Criação e edição atômicas

-   Criar pedido, associar/criar cliente, gravar itens e atualizar
    contagem em uma única transação.
-   Em falha de qualquer etapa, fazer rollback de todas as alterações.
-   Atualizar o pedido e substituir os itens, quando fornecidos,
    atomicamente.
-   Usar transações Prisma e considerar conflitos de unicidade e
    concorrência.

## 11. Edição de pedidos --- PATCH

Implementar `PATCH /orders/:id` com edição flexível dos seguintes dados:

-   número do pedido;
-   previsão de entrega;
-   endereço de entrega;
-   dados do cliente;
-   status, respeitando transições permitidas;
-   itens do pedido.

Regras do PATCH:

-   Campos omitidos permanecem inalterados.
-   `items` omitido significa manter os itens atuais.
-   Quando `items` for enviado com uma lista não vazia, substituir
    **todos** os itens existentes pela lista recebida.
-   `items: []` deve ser rejeitado; um pedido não pode ficar sem itens.
-   A remoção dos itens antigos e a inserção dos novos devem ocorrer na
    mesma transação.
-   Validar duplicidade de `orderNumber` e retornar `409 Conflict`.
-   Não permitir editar pedidos excluídos logicamente.
-   Não permitir alterar o status para uma transição não autorizada.
-   Atualizar `updatedAt` de forma consistente.
-   O endpoint deve validar todos os dados antes de persistir as
    alterações.

## 12. Exclusão lógica

Implementar `DELETE /orders/:id`, permitido somente para `ADMIN`.

-   Não executar exclusão física do registro.
-   Preencher `deletedAt` com a data/hora atual.
-   Decrementar `customer.ordersCount` uma única vez.
-   Fazer as alterações na mesma transação.
-   Pedidos excluídos não devem aparecer na listagem normal nem em
    consultas comuns por ID.
-   Pedidos excluídos não podem ser editados nem excluídos novamente.
-   Manter `orderNumber` reservado no banco mesmo após a exclusão
    lógica.
-   Retornar `204 No Content`, sem corpo.
-   Se o pedido não existir ou já estiver excluído, retornar
    `404 Not Found`.

## 13. Endpoints REST

Todos os endpoints de domínio devem seguir REST e ser documentados no
Swagger.

  -----------------------------------------------------------------------
  Método            Rota              Finalidade        Acesso
  ----------------- ----------------- ----------------- -----------------
  `POST`            `/auth/login`     Autenticar        Público
                                      usuário           

  `POST`            `/users`          Cadastrar usuário ADMIN

  `POST`            `/orders`         Criar pedido      ADMIN, USER

  `GET`             `/orders`         Listar, filtrar e ADMIN, USER
                                      paginar pedidos   
                                      ativos            

  `GET`             `/orders/:id`     Consultar pedido  ADMIN, USER
                                      ativo             

  `PATCH`           `/orders/:id`     Editar pedido     ADMIN, USER
                                      ativo             

  `DELETE`          `/orders/:id`     Excluir pedido    ADMIN
                                      logicamente       

  `GET`             `/health`         Saúde da API e do Público
                                      banco (seção      
                                      13.3)             
  -----------------------------------------------------------------------

Não criar CRUD independente de clientes nesta etapa. A gestão de
clientes ocorre pelas operações de pedido.

### 13.1 Criação de pedido

O request deve permitir informar:

-   `orderNumber`;
-   `expectedDeliveryDate`;
-   `deliveryAddress`;
-   dados do cliente (`name` e documento CPF/CNPJ);
-   lista não vazia de itens, cada um com descrição e preço.

O `status` inicial deve ser `PENDING`, definido pelo backend. O usuário
autenticado deve ser associado em `createdById`; não confiar em um
`createdById` fornecido pelo cliente.

### 13.2 Listagem, filtros e paginação

`GET /orders` deve aceitar:

-   `page` --- página, começando em `1`;
-   `limit` --- quantidade por página, com valor padrão documentado e
    limite máximo configurado;
-   `orderNumber` --- busca parcial, por trecho do número;
-   `startDate` --- data inicial da criação do pedido;
-   `endDate` --- data final da criação do pedido;
-   `status` --- um dos seis status válidos.

Regras:

-   Os filtros podem ser combinados.
-   Retornar somente pedidos com `deletedAt = null`.
-   O filtro por período usa `createdAt`, não `expectedDeliveryDate`.
-   `startDate` e `endDate` são inclusivos do ponto de vista do usuário.
    Para `endDate` em formato `YYYY-MM-DD`, implementar o limite
    superior de forma que inclua todo aquele dia, sem perder registros
    por causa do horário.
-   Validar datas e rejeitar `startDate` posterior a `endDate`.
-   A busca por número do pedido deve ser parcial.
-   Aplicar ordenação determinística, preferencialmente por `createdAt`
    descendente e um segundo critério estável em caso de empate.
-   Retornar a estrutura:

``` json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

Documentar o comportamento quando não houver resultados e validar
valores inválidos de `page` e `limit`.

### 13.3 Health check

`GET /health` verifica a saúde da API e do banco de dados, para uso em
monitoramento e healthchecks de container.

-   Rota pública: deve continuar acessível sem token quando a
    autenticação global for implementada.
-   `200 OK` quando o banco responde; `503 Service Unavailable` quando
    não responde.
-   `openConnections`: sessões de clientes abertas no PostgreSQL
    (`pg_stat_activity`).
-   `availableConnections`: `max_connections` menos as conexões
    reservadas (`superuser_reserved_connections` e
    `reserved_connections`) e as abertas.
-   Exceção ao contrato da seção 14.1: segue o formato usual de health
    checks, sem envelope `data`.

``` json
{
  "status": "Healthy",
  "database": {
    "status": "Healthy",
    "openConnections": 1,
    "availableConnections": 96,
    "maxConnections": 100
  }
}
```

Banco indisponível (`503`):

``` json
{
  "status": "Unhealthy",
  "database": { "status": "Unhealthy" }
}
```

## 14. Contrato de respostas HTTP

### 14.1 Sucesso

-   Respostas de recurso individual usam `{ "data": ... }`.
-   Listagens usam `{ "data": [...], "meta": {...} }`.
-   Respostas com aviso de negócio podem incluir `warnings` no mesmo
    nível de `data`.
-   `DELETE` bem-sucedido retorna `204 No Content`, sem corpo.

Exemplo geral de recurso:

``` json
{
  "data": {
    "id": "uuid"
  }
}
```

### 14.2 Erros

Padronizar erros por meio de um filtro global de exceções. Formato base:

``` json
{
  "statusCode": 400,
  "message": "Descrição do erro",
  "error": "BAD_REQUEST"
}
```

`message` pode ser uma lista de mensagens quando houver múltiplos erros
de validação.

Códigos esperados:

-   `400 Bad Request`: entrada inválida, CPF/CNPJ inválido ou transição de
    status não permitida.
-   `401 Unauthorized`: token ausente, inválido ou expirado, ou
    credenciais inválidas.
-   `403 Forbidden`: usuário autenticado sem permissão.
-   `404 Not Found`: recurso inexistente ou pedido excluído logicamente.
-   `409 Conflict`: número do pedido ou email duplicado, ou conflito de
    unicidade equivalente.
-   `500 Internal Server Error`: falha inesperada, sem expor stack trace
    ou detalhes internos ao cliente.

Usar códigos HTTP apropriados e não retornar detalhes sensíveis do banco
ou da aplicação.

## 15. Validação e segurança

-   Habilitar `ValidationPipe` global com `whitelist: true`,
    `forbidNonWhitelisted: true` e transformação de tipos quando
    apropriado.
-   Validar DTOs em todas as entradas.
-   Validar email, senha, UUID, datas, enum de status, CPF/CNPJ, número do
    pedido, itens e preços.
-   Normalizar email e documento (CPF/CNPJ) antes de persistir.
-   Hash de senha com Argon2id (ver seção 3); nunca armazenar a senha em
    texto puro.
-   Não expor `passwordHash` nem outros campos internos.
-   Não confiar no papel ou ID do criador enviados no body.
-   Usar consultas parametrizadas via Prisma.
-   Manter segredos em variáveis de ambiente.
-   Configurar CORS de forma explícita e documentar como permitir o
    futuro frontend.
-   Não implementar cadastro público.
-   Proteger o Swagger em produção se o ambiente exigir, mas documentar
    como acessar a documentação durante desenvolvimento.
-   Não expor stack traces, SQL ou segredos nas respostas de erro.

## 16. Swagger / OpenAPI

Configurar documentação automática em `/api/docs` (interface Swagger UI)
e `/api/docs-json` (especificação OpenAPI em JSON). A configuração fica
em `src/swagger.ts`.

**Documentar junto com o código:** todo endpoint deve ser documentado
no Swagger no mesmo momento em que é criado, nunca em uma etapa
posterior. Uma rota só está concluída quando aparece corretamente em
`/api/docs`.

-   Usar classes (DTOs) com `@ApiProperty`/`@ApiPropertyOptional` para
    requests e responses; o Swagger não lê interfaces TypeScript.
-   Em cada controller: `@ApiTags`, `@ApiOperation` e um decorator de
    resposta para cada status possível (`@ApiOkResponse`,
    `@ApiCreatedResponse`, `@ApiBadRequestResponse` etc.).
-   Manter um teste que verifica se o endpoint aparece no documento
    OpenAPI gerado (ver `src/swagger.spec.ts`).
-   Descrever todos os endpoints, DTOs, respostas de sucesso e erros.
-   Documentar query params, paginação, filtros e enums.
-   Configurar o esquema de segurança Bearer JWT no Swagger.
-   Marcar endpoints protegidos com o decorator de API correspondente.
-   Documentar quais rotas exigem `ADMIN` e quais aceitam `ADMIN` ou
    `USER`.
-   Garantir que a documentação acompanhe as mudanças nos DTOs e
    contratos.

## 17. Testes automatizados

Usar Vitest. **Não criar testes E2E nesta etapa.** O escopo inclui
testes unitários e testes de integração.

O NestJS 12 é distribuído apenas como ESM. O Jest só executa ESM com a
flag experimental `--experimental-vm-modules` do Node e exige APIs
instáveis para mock de módulos (`jest.unstable_mockModule`). Por isso o
projeto usa o Vitest, que suporta ESM nativamente e é o runner adotado
pelo template oficial do NestJS 12. A API é equivalente à do Jest
(`describe`, `it`, `expect`, `vi.fn()`, `vi.spyOn()`).

Convenções:

-   Importar as funções de teste explicitamente de `vitest`
    (`import { describe, expect, it, vi } from 'vitest'`); não usar
    globals.
-   Testes unitários: arquivos `*.spec.ts` dentro de `src/`, ao lado do
    código testado. Configuração em `vitest.config.ts`.
-   Testes de integração: arquivos `*.integration-spec.ts` em `src/` ou
    `test/`. Configuração em `vitest.config.integration.ts`, executados
    em série por compartilharem o banco de teste.
-   Usar `Test.createTestingModule` do `@nestjs/testing` para montar os
    módulos e substituir dependências por mocks.

### 17.1 Testes unitários

Cobrir, no mínimo:

-   autenticação: credenciais corretas/incorretas e usuário inativo;
-   hash e verificação de senha;
-   autorização por papel;
-   validação de CPF/CNPJ, normalização e identificação do tipo de cliente;
-   criação e reutilização de cliente;
-   warning quando o nome diverge para um documento já cadastrado;
-   transições válidas e inválidas de status;
-   contagem de pedidos ativos;
-   bloqueio de edição/exclusão de pedido excluído;
-   substituição integral de itens no PATCH;
-   validações de paginação e filtros;
-   mapeamento de erros e respostas públicas sem credenciais.

### 17.2 Testes de integração

Testar componentes integrados com PostgreSQL de teste ou ambiente de
teste isolado:

-   persistência e relacionamento entre usuário, cliente, pedido e
    itens;
-   criação atômica de pedido;
-   rollback se uma etapa da criação falhar;
-   documento único sob tentativas de criação concorrentes;
-   número do pedido único;
-   atualização de `ordersCount` ao criar, trocar cliente e excluir
    logicamente;
-   decremento único ao excluir logicamente;
-   substituição de itens dentro de transação;
-   filtros combinados e paginação;
-   exclusão lógica excluída das consultas comuns;
-   endpoints e autenticação/autorizações nos limites de integração
    apropriados.

Os testes devem ser determinísticos e não depender de serviços externos.
Não usar o banco de desenvolvimento para testes destrutivos.

## 18. Docker, migrations e seed

### 18.1 Docker

Criar `Dockerfile` para a API e `compose.yaml` para executar localmente
a API e o PostgreSQL.

Até a etapa 17, o `compose.yaml` executa apenas o PostgreSQL; a API roda
localmente com `npm run start:dev`. Subir e parar o banco com
`npm run db:up` e `npm run db:down`, que usam `.env.development`.

-   Usar volumes para persistência local do banco.
-   Configurar variáveis de ambiente.
-   Definir healthcheck para PostgreSQL quando apropriado.
-   Documentar como iniciar e parar o ambiente.
-   Não embutir segredos de produção na imagem.

### 18.2 Prisma migrations

-   Versionar migrations.
-   Documentar os comandos para criar e aplicar migrations.
-   Usar `prisma migrate deploy` em execução que precise aplicar
    migrations existentes.
-   Não depender de `prisma db push` como substituto das migrations
    versionadas no fluxo normal do projeto.

### 18.3 Seed idempotente

Criar seed reproduzível e idempotente com dados fictícios:

-   Pelo menos **dois usuários**: um `ADMIN` e um `USER`.
-   Senhas de seed armazenadas como hashes.
-   Pelo menos **20 pedidos fictícios**, com clientes, itens, status e
    datas variadas para demonstrar filtros e paginação.
-   Dados suficientes para testar busca parcial por número e filtro por
    período/status.
-   Reexecutar o seed não deve gerar duplicações desnecessárias.
-   Documentar as credenciais locais de demonstração no README, deixando
    explícito que são apenas para desenvolvimento e devem ser
    alteradas/não utilizadas em produção.
-   Não incluir dados pessoais reais.

## 19. Scripts npm

Criar scripts claros e documentados, incluindo equivalentes para:

-   `start`
-   `start:dev`
-   `start:prod`
-   `build`
-   `lint`
-   `format`
-   `test` --- testes unitários (`vitest run`)
-   `test:watch` --- testes unitários em modo watch (`vitest`)
-   `test:cov` --- testes unitários com cobertura
    (`vitest run --coverage`)
-   `test:integration` --- testes de integração
    (`vitest run --config vitest.config.integration.ts`)
-   `db:up` / `db:down` --- sobe/para o PostgreSQL do `compose.yaml`
-   `prisma:generate` --- também executado no `postinstall`
-   `prisma:migrate` --- cria e aplica migrations em desenvolvimento
    (`prisma migrate dev`)
-   `prisma:migrate:deploy` --- aplica migrations existentes
    (`prisma migrate deploy`)
-   `prisma:seed`

**Não criar `test:e2e` nem configurar uma suíte E2E**, pois o escopo
aprovado contempla apenas testes unitários e de integração.

Os nomes finais dos scripts podem seguir as convenções do NestJS, desde
que o README os documente e a distinção entre testes unitários e de
integração fique clara.

## 20. README obrigatório

Criar README em português com:

1.  descrição e objetivo do projeto;
2.  princípio API First e visão geral da arquitetura;
3.  stack tecnológica;
4.  pré-requisitos;
5.  configuração de `.env`;
6.  execução local com Docker Compose;
7.  instalação de dependências;
8.  geração do Prisma Client;
9.  migrations;
10. seed e credenciais de demonstração;
11. comandos/scripts disponíveis;
12. execução de testes unitários e de integração;
13. acesso ao Swagger em `/api/docs`;
14. autenticação JWT Bearer;
15. endpoints, filtros, paginação, status e permissões;
16. formato de sucesso, warnings e erros;
17. observações de segurança para ambiente de produção.

Não documentar comportamento que não esteja implementado.

## 21. Ordem de implementação sugerida

Executar em etapas pequenas, verificando build, lint e testes a cada
etapa:

1.  Inicializar NestJS 12 em ESM, TypeScript estrito, ESLint, Prettier,
    Vitest e scripts.
2.  Configurar variáveis de ambiente e validação de configuração.
3.  Configurar PostgreSQL, Docker Compose, Prisma, migrations e a rota
    `GET /health` (seção 13.3).
4.  Configurar Swagger em `/api/docs` com Bearer JWT. A partir desta
    etapa, todo endpoint é documentado no Swagger no mesmo momento em
    que é criado (seção 16).
5.  Criar os modelos e relacionamentos de User, Customer, Order e
    OrderItem.
6.  Implementar contratos de request/response, DTOs e validação global.
7.  Implementar resposta de erro padronizada.
8.  Implementar autenticação, JWT, guards e autorização por papel.
9.  Implementar criação administrativa de usuários e os contratos
    `UserRequest`/`UserResponse`.
10. Implementar regras de CPF/CNPJ e criação/reutilização de clientes.
11. Implementar criação de pedido e itens com transação.
12. Implementar listagem, filtros e paginação.
13. Implementar consulta por ID e PATCH, incluindo transições de status
    e substituição transacional de itens.
14. Implementar exclusão lógica e contagem de pedidos ativos.
15. Criar seed idempotente com usuários e pedidos fictícios.
16. Completar os testes unitários e de integração.
17. Finalizar Docker, scripts e README.
18. Executar a verificação final: build, lint, testes unitários, testes
    de integração, migrations e seed em ambiente apropriado.

## 22. Critérios de aceite

A fundação estará concluída quando:

-   [ ] A aplicação NestJS compilar com TypeScript estrito.
-   [ ] PostgreSQL estiver disponível pelo Docker Compose.
-   [ ] Prisma schema e migrations estiverem versionados e aplicáveis.
-   [ ] O seed criar dois usuários e pelo menos 20 pedidos fictícios de
    forma idempotente.
-   [ ] Login gerar JWT com validade configurada de pelo menos 5 horas.
-   [ ] Rotas protegidas exigirem `Authorization: Bearer <token>`.
-   [ ] `ADMIN` e `USER` tiverem as permissões definidas neste
    documento.
-   [ ] Request e response de User tiverem interfaces distintas.
-   [ ] Nenhuma resposta expuser senha ou hash.
-   [ ] CPF/CNPJ for normalizado, validado, único e definir o tipo do cliente.
-   [ ] Clientes forem criados/reutilizados automaticamente nos pedidos.
-   [ ] Aviso de divergência de nome for retornado sem tratar a operação
    como erro.
-   [ ] Pedidos e itens forem criados/atualizados atomicamente.
-   [ ] `ordersCount` refletir apenas pedidos ativos e for atualizado
    transacionalmente.
-   [ ] Os seis status e suas transições forem respeitados.
-   [ ] PATCH substituir todos os itens quando `items` for informado e
    rejeitar lista vazia.
-   [ ] Soft delete preservar o registro, liberar o pedido das consultas
    comuns e decrementar a contagem uma única vez.
-   [ ] Filtros, busca parcial e paginação funcionarem em conjunto.
-   [ ] Respostas de sucesso e erros seguirem os contratos deste
    documento.
-   [ ] Swagger estiver acessível em `/api/docs` e documentar Bearer
    JWT.
-   [ ] Testes unitários e de integração estiverem implementados e
    executáveis; nenhuma suíte E2E for criada.
-   [ ] README documentar instalação, configuração, seed, scripts,
    autenticação e endpoints.
-   [ ] Nenhum segredo real estiver versionado.

## 23. Instrução final ao Claude

Implemente a fundação seguindo este documento e preserve o princípio
**API First**. Antes de adicionar qualquer funcionalidade não
especificada, pare e peça confirmação. Ao concluir cada etapa, informe
os arquivos principais criados/alterados, os comandos executados e os
resultados reais de build, lint e testes. Não afirme que uma verificação
passou sem executá-la. Não crie frontend nesta fase.
