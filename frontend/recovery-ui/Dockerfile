# Build stage: install deps and produce the production bundle
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin API: browser calls /api/... on nginx, which proxies to the backend.
# An empty VITE_API_BASE_URL makes the built bundle resolve API calls to /api/...,
# matching the nginx proxy config. (Dev uses http://localhost:8080 from .env.)
ENV VITE_API_BASE_URL=""
# Bake the operator key into the bundle so every admin call (reset, radar, analytics,
# simulate) automatically carries X-Admin-Key. Keep in sync with the backend
# ADMIN_API_KEY. The login screen is the UX gate on top of this.
ARG VITE_ADMIN_API_KEY=dev_admin_key_2026
ENV VITE_ADMIN_API_KEY=$VITE_ADMIN_API_KEY
RUN npm run build

# Runtime stage: serve static assets with nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
