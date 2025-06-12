FROM node:18-alpine

WORKDIR /app

# Copiar package.json (obligatorio)
COPY package.json ./

# Copiar package-lock.json SI EXISTE (opcional)
COPY package-loc[k].json ./

# Script inteligente mejorado
RUN if [ ! -f package-lock.json ]; then \
      echo "📦 package-lock.json no encontrado, generando con npm install..."; \
      npm install --silent; \
    else \
      echo "✅ Usando package-lock.json existente con npm ci..."; \
      npm ci --silent; \
    fi

# Copiar el resto del código
COPY . .

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs || true
RUN adduser -S reactjs -u 1001 || true
RUN chown -R reactjs:nodejs /app

USER reactjs

EXPOSE 3000

ENV SKIP_PREFLIGHT_CHECK=true

CMD ["npm", "start"]