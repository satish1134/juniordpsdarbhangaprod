# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies (including devDependencies needed for vite & esbuild)
RUN npm install
COPY . .
# Run production build
RUN npm run build

# Production Runtime Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Only install production runtime dependencies
RUN npm install --omit=dev
# Copy compiled bundles from builder
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
