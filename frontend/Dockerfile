# syntax=docker/dockerfile:1

# Imagem do frontend naPorta (Next.js standalone). Nenhum segredo é
# embutido: API_URL chega como variável de ambiente na execução.

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# Imagem final: só o servidor standalone, os assets estáticos e o public.
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/login" || exit 1
CMD ["node", "server.js"]
