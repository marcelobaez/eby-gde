FROM node:18-alpine as build
# Installing libvips-dev for sharp Compatability
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev > /dev/null 2>&1
RUN corepack enable
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY ./package.json ./pnpm-lock.yaml ./
ENV PATH /opt/node_modules/.bin:$PATH
RUN pnpm install --frozen-lockfile --prod
WORKDIR /opt/app
COPY ./ .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm run build

FROM node:18-alpine
# Installing libvips-dev for sharp Compatability
RUN apk add --no-cache vips-dev
RUN corepack enable
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY --from=build /opt/node_modules ./node_modules
ENV PATH /opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY --from=build /opt/app ./
EXPOSE 1337
CMD ["pnpm", "run", "start"]
