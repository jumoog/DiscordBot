FROM oven/bun:1.3.5-alpine AS base
WORKDIR /HypetrainDiscordBot

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .
ENV USERID= \
	ROOMNAME= \
	CLIENTID= \
	CLIENTSECRET= \
	DISCORDTOKEN= \ 
	DEBUGROOMNAME=
HEALTHCHECK --interval=60s --timeout=12s --start-period=30s CMD bun run healthcheck.ts
ENTRYPOINT [ "bun", "run", "index.ts" ]