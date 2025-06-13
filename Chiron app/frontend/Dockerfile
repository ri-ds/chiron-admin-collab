FROM node:20-slim as builder
ARG proxy
ARG VITE_MUI_KEY
ENV HTTP_PROXY=${proxy}
ENV HTTPS_PROXY=${proxy}
ENV VITE_MUI_KEY=${VITE_MUI_KEY}
RUN corepack enable && \
    corepack prepare pnpm@latest-8 --activate && \
    pnpm config set store-dir .pnpm-store
WORKDIR /code
COPY package.json pnpm-lock.yaml /code/
RUN pnpm i
COPY . /code/
RUN pnpm run build

FROM nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /code/dist/ /usr/share/nginx/html/
EXPOSE 80