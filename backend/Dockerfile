# syntax=docker/dockerfile:1

# Imagem da API naPorta. Nenhum segredo é embutido: DATABASE_URL,
# JWT_SECRET etc. chegam como variáveis de ambiente na execução.

ARG NODE_IMAGE=node:24-alpine

# Dependências completas (inclui Prisma CLI, usado no build e nas migrations).
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Sem scripts: o postinstall (prisma generate) precisa do schema, gerado
# no estágio de build.
RUN npm ci --ignore-scripts

# Gera o Prisma Client e compila a aplicação.
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

# Migrations e seed: `prisma migrate deploy` / `npm run prisma:seed`.
# Usado pelo serviço `migrate` do compose.yaml; não sobe a API. Sem
# NODE_ENV=production: o seed de demonstração se recusa a rodar nele.
FROM build AS migrator
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
CMD ["npx", "prisma", "migrate", "deploy"]

# Somente dependências de produção. O argon2 traz binários prontos
# (inclusive musl), então não precisa compilar nem rodar scripts.
# Obs.: o npm instala o Prisma CLI aqui por ser peer obrigatório do
# @prisma/client; ele não é usado em runtime.
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Imagem final: código compilado + dependências de produção, usuário sem root.
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3333
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "dist/main.js"]
