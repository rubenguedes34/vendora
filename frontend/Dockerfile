# Build the Angular app, then serve the static bundle with nginx.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration docker

FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY docker-banner.sh /docker-entrypoint.d/40-banner.sh
RUN chmod +x /docker-entrypoint.d/40-banner.sh

EXPOSE 80
