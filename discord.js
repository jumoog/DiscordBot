import EventEmitter from 'events';
import dotenv from 'dotenv';
import signale from "signale";
import { AttachmentBuilder, Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import PQueue from 'p-queue';
dotenv.config();
const DiscordMessageQueue = new PQueue({ concurrency: 1 });
const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
export var rooms;
(function (rooms) {
    rooms["hypetrain"] = "HYPETRAIN";
    rooms["debug"] = "DEBUG";
    rooms["shoutout"] = "SHOUTOUT";
    rooms["socials"] = "SOCIALS";
})(rooms || (rooms = {}));
export class DiscordBot extends EventEmitter {
    _discordToken;
    _lastCoolDownMessage;
    _discordClient;
    _rooms;
    constructor() {
        super();
        this._discordToken = process.env.DISCORDTOKEN || '';
        this._discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
        this._lastCoolDownMessage = undefined;
        this._rooms = new Map();
    }
    async main() {
        this._discordClient.once(Events.ClientReady, c => {
            this._rooms.set(rooms.hypetrain, this.getChannel(process.env.ROOMNAME || '🚀┃hypetrain'));
            this._rooms.set(rooms.debug, this.getChannel(process.env.DEBUGROOMNAME || 'debug_prod'));
            this._rooms.set(rooms.shoutout, this.getChannel(process.env.SHOUTOUTROOMNAME || 'shoutout'));
            this._rooms.set(rooms.socials, this.getChannel(process.env.SOCIALSROOMNAME || '📸┃socials'));
            this.sendMessage(`Ready! Logged in as ${c.user.tag}`, rooms.debug);
            signale.success(`Ready! Logged in as ${c.user.tag}`);
        });
        this._discordClient.login(this._discordToken);
        while (!this._discordClient.isReady()) {
            await sleep(100);
        }
    }
    getChannel(room) {
        return this._discordClient.channels.cache.find((channel) => channel.name === room);
    }
    async sendMessage(message, room) {
        DiscordMessageQueue.add(() => this.messageQueue(message, room));
    }
    async messageQueue(message, room) {
        if (this._discordClient.isReady()) {
            const target = this._rooms.get(room);
            if (target?.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                if (typeof message === "string") {
                    if (message.includes('The hype train cool down ends')) {
                        this._lastCoolDownMessage = await target.send(message);
                    }
                    else {
                        await target.send(message);
                    }
                }
                else {
                    await target.send(message);
                }
            }
            else {
                signale.error(`Help! i can't post in <${room}>`);
            }
        }
        await sleep(750);
    }
    deleteCoolDown() {
        if (this._discordClient.isReady()) {
            this._lastCoolDownMessage?.delete();
        }
    }
    async sendIgPost(element) {
        const url = this.hasProp(element, "thumbnail_url") ? element.thumbnail_url : element.media_url;
        const blob = await fetch(url).then((r) => r.blob());
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const file = new AttachmentBuilder(buffer, { name: 'preview.jpg' });
        const embed = new EmbedBuilder()
            .setTitle(element.permalink?.includes('/reel/') ? 'Annabel shared a new reel!' : 'Annabel shared a new post!')
            .setURL(element.permalink)
            .setDescription(this.hasProp(element, "caption") ? this.extractMentions(element.caption) : null)
            .setImage('attachment://preview.jpg')
            .setColor("#D300C5")
            .setFooter({
            text: 'Instagram',
        })
            .setTimestamp();
        this.sendMessage({ content: '<@&953017309369344031>', embeds: [embed], files: [file] }, rooms.socials);
    }
    hasProp(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    extractMentions(text) {
        const resourceRegex = /\@(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}/gm;
        const maxChars = 100;
        if (text.length > maxChars) {
            text = text.slice(0, maxChars).split(' ').slice(0, -1).join(' ') + ' ...';
        }
        for (let match of text.matchAll(resourceRegex)) {
            text = text.replace(match[0], `[${match[0]}](https://www.instagram.com/${match[0].slice(1)}/)`);
        }
        return text;
    }
}
