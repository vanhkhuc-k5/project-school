# =============================================================================
# EduPortal Dockerfile — Multi-stage Production Build (G53)
# =============================================================================
# Target: < 200MB image, non-root user, Node.js 24

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:24-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (needed for build)
RUN npm ci

# =============================================================================
# Stage 2: Builder - Build Frontend
# =============================================================================
FROM deps AS builder
WORKDIR /app

# Copy source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV VITE_API_URL=/api

# Build the frontend (outputs to /dist)
RUN npm run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:24-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodeapp && \
    adduser --system --uid 1001 eduportal --ingroup nodeapp

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    # Skip PostgreSQL native driver compilation in production
    npm_config_build_from_source=false

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend assets
COPY --from=builder --chown=eduportal:nodeapp /app/dist ./dist

# Copy server files
COPY --chown=eduportal:nodeapp server ./server

# Create required directories
RUN mkdir -p /app/logs && chown eduportal:nodeapp /app/logs

# Set ownership
RUN chown -R eduportal:nodeapp /app

# Switch to non-root user for security
USER eduportal

# Expose port
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the backend server
CMD ["node", "server/index.js"]
