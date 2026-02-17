# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cli/package.json ./cli/

# Install dependencies
RUN npm install

# Copy source files
COPY backend ./backend
COPY frontend ./frontend
COPY cli ./cli

# Build frontend
RUN npm run build -w frontend

# Build backend
RUN npm run build -w backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json ./
COPY backend/package.json ./backend/
COPY cli/package.json ./cli/

# We need all deps since we're running from source for backend
RUN npm install --omit=dev

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy backend source (we run with tsx in dev, but built js in prod)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/

# Copy CLI
COPY --from=builder /app/cli ./cli

# Create data directory and non-root user
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup \
    && mkdir -p /app/data \
    && chown -R appuser:appgroup /app/data

USER 1001

# Set environment
ENV NODE_ENV=production
ENV DB_PATH=/app/data/magic-link.db

EXPOSE 3000

# Start the server
CMD ["node", "backend/dist/index.js"]
