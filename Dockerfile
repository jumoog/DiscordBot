FROM oven/bun:1.0.17
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
RUN apt-get clean && apt-get update && apt-get upgrade -y &&\
    apt-get autoremove -y && apt-get autoclean -y &&\
    rm -rf /var/lib/apt/lists/* &&\
    bun install --production &&\
    chmod +x /bin/dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "index.ts"]