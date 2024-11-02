FROM oven/bun:1.1.34-alpine
WORKDIR /HypetrainDiscordBot

RUN apk update && apk add --no-cache tini

COPY . .
ENV USERID= \
	ROOMNAME= \
	CLIENTID= \
	CLIENTSECRET= \
	DISCORDTOKEN= \ 
	DEBUGROOMNAME=
RUN bun install --production --ignore-scripts
HEALTHCHECK --interval=60s --timeout=12s --start-period=30s CMD bun run healthcheck.ts
ENTRYPOINT ["tini", "--"]
CMD ["bun", "index.ts"]