FROM oven/bun:1.0.20-alpine
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /HypetrainDiscordBot
COPY . .
ENV USERID= \
	ROOMNAME= \
	CLIENTID= \
	CLIENTSECRET= \
	DISCORDTOKEN= \ 
	DEBUGROOMNAME=
ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 /bin/dumb-init
RUN bun install --production --ignore-scripts &&\
    chmod +x /bin/dumb-init
HEALTHCHECK --interval=60s --timeout=12s --start-period=30s CMD bun run healthcheck.ts
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "index.ts"]