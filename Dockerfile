FROM node:19.5.0-bullseye-slim
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
RUN npm ci --only=production &&\
    npm cache clean --force &&\
    chmod +x /bin/dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]