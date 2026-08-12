# LabFlow production demo image — zero runtime dependencies
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
# ModelScope 创空间 Docker 固定端口 7860
ENV PORT=7860

FROM base AS production
COPY package.json ./
COPY server.js ./
COPY public ./public
COPY data ./data
EXPOSE 7860
CMD ["node", "server.js"]
