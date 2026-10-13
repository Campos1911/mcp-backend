# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:24-slim AS builder
WORKDIR /app

# Variável padrão para permitir que o npx prisma generate compile os tipos
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Instalar dependências para compilação C++ do better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Liberar e aprovar scripts de compilação do npm 12
RUN npm install-scripts approve --all || true
RUN npm install

# Gerar os tipos locais do Prisma
RUN npx prisma generate

# Copiar código-fonte e compilar o NestJS
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ==========================================
# STAGE 2: Runner (Produção)
# ==========================================
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Copiar dependências compiladas, executáveis e cliente gerado
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

CMD ["node", "dist/main.js"]
