# Dockerfile for Vite + React app
FROM node:lts AS builder
WORKDIR /app
# Copy only dependency files first for better caching
COPY package.json bun.lockb ./
# Install Bun and dependencies
RUN npm install -g bun && bun install
# Copy the rest of the source code
COPY . .
# Ensure a clean install/build (remove any bun cache and reinstall deps)
RUN rm -rf /root/.bun || true
RUN rm -rf node_modules || true
RUN bun install

# Build the app
RUN bun run build

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
# Copy built files
COPY --from=builder /app/dist .
# Optionally copy only static files from public (not index.html)
COPY public/robots.txt public/favicon.ico ./
# Copy custom nginx config for SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
