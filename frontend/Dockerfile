# Frontend de Umbral: se compila con Vite y lo sirve nginx, que además hace de
# puerta de entrada: /api va al backend y todo lo demás es la app.

FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Si la app vive en una subcarpeta del dominio (p. ej. /umbral/), compila con
# --build-arg VITE_BASE_URL=/umbral/
ARG VITE_BASE_URL=/
ENV VITE_BASE_URL=${VITE_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-seguridad.conf /etc/nginx/snippets/seguridad.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
