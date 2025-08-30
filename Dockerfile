FROM node:20-alpine AS base
WORKDIR /app

# Install OS deps
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS builder
COPY package*.json ./
RUN npm ci

# Copy source files
COPY tsconfig*.json vite.config.ts ./
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
COPY src ./src
COPY public ./public
COPY index.html ./

# Build both frontend and backend
RUN npm run build && npm run build:server

FROM base AS runner
ENV NODE_ENV=production
USER node
WORKDIR /app

# Copy dependencies and built files
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server-dist ./server-dist
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const options={host:'localhost',port:3001,path:'/health',timeout:2000};const request=http.request(options,(res)=>{if(res.statusCode===200){process.exit(0)}else{process.exit(1)}});request.on('error',()=>process.exit(1));request.end();"

CMD ["/usr/bin/dumb-init", "node", "server-dist/server/index.js"]
