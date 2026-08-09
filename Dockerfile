# LabFlow production demo image — zero runtime dependencies
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS production
COPY package.json ./
COPY server.js ./
COPY public ./public
COPY data ./data
EXPOSE 4173
CMD ["node", "server.js"]
