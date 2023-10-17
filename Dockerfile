FROM node:20.8.1-bullseye-slim
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /HypetrainDiscordBot
COPY . .
ENV NODE_ENV production
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
    npm ci --only=production &&\
    npm cache clean --force &&\
    chmod +x /bin/dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]