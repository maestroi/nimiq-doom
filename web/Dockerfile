FROM node:20-alpine AS builder

WORKDIR /app

COPY web/package.json web/package-lock.json* ./
RUN npm ci

COPY web/ .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
# Copy manifests directory to serve as static files
COPY manifests /usr/share/nginx/html/manifests

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
