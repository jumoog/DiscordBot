import EventEmitter from 'events';
import signale from "signale";
import fs from 'node:fs';
import { ActivityType, AttachmentBuilder, AuditLogEvent, ChannelType, ChatInputCommandInteraction, Client, codeBlock, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildBan, GuildMember, PartialGuildMember, Message, MessageCreateOptions, MessagePayload, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, TextChannel, User, VoiceChannel, userMention, roleMention, channelMention, InteractionContextType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import PQueue from 'p-queue';
import { InstagramMediaItem } from './Instagram.ts';
import { Cron } from "croner";
import { sleep } from 'bun';

const DiscordMessageQueue = new PQueue({ concurrency: 1 });

const ANNABEL_DC = "821708215216635904";
const STATS_ROOM = "1189573435710521345";
const CONTENT_ROLE = "953017309369344031";
const INTRO_ROOM = "821709936563191849";

const STICKY_NOTE = `__**Sticky Message:**__

Welcome to the A-Team!
Here are some prompts to help you introduce yourself so we can get to know each other:

${codeBlock(`**Name:** 
**Where I'm from/based:** 
**How I found out about ANNABEL:** 
**My favourite ANNABEL DJ set:** 
**My favourite ANNABEL experience (e.g. live show or other):** 
**Other music interests:** 
**Other interests:** 
**Something I'm looking forward to:** `)}`

export enum Rooms {
    HYPETRAIN = "HYPETRAIN",
    DEBUG = "DEBUG",
    SHOUTOUT = "SHOUTOUT",
    SOCIALS = "SOCIALS",
    STATS = "STATS",
    MODLOG = "MODLOG",
    INTRO = "INTRO"
}

type FeatureToggles = {
    instagramPostingEnabled: boolean;
    stickyNoteEnabled: boolean;
    shoutoutChannelId?: string;
    socialsChannelId?: string;
}

export class DiscordBot extends EventEmitter {
    private _discordToken: string;
    private _lastCoolDownMessage: Message | undefined;
    private _discordClient: Client;
    private _rooms: Map<string, TextChannel | VoiceChannel | null>;
    private _memberCount: number;
    private readonly _featureTogglesPath: string;
    private _featureToggles: FeatureToggles;

    constructor() {
        super();
        this._discordToken = process.env.DISCORDTOKEN ?? '';
        const tokenDir = fs.existsSync('/tokens/') ? '/tokens/' : './';
        this._featureTogglesPath = `${tokenDir}featureToggles.json`;
        this._featureToggles = this.loadFeatureToggles();
        this._discordClient = new Client({
            partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message],
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences
            ],
        });
        this._lastCoolDownMessage = undefined;
        this._rooms = new Map();
        this._memberCount = 0;
    }

    private loadFeatureToggles(): FeatureToggles {
        const defaults: FeatureToggles = {
            instagramPostingEnabled: true,
            stickyNoteEnabled: true,
            shoutoutChannelId: undefined,
            socialsChannelId: undefined,
        };

        try {
            if (!fs.existsSync(this._featureTogglesPath)) {
                fs.writeFileSync(this._featureTogglesPath, JSON.stringify(defaults, null, 4));
                return defaults;
            }

            const parsed = JSON.parse(fs.readFileSync(this._featureTogglesPath, 'utf8')) as Partial<FeatureToggles>;
            const merged: FeatureToggles = {
                instagramPostingEnabled: typeof parsed.instagramPostingEnabled === 'boolean' ? parsed.instagramPostingEnabled : defaults.instagramPostingEnabled,
                stickyNoteEnabled: typeof parsed.stickyNoteEnabled === 'boolean' ? parsed.stickyNoteEnabled : defaults.stickyNoteEnabled,
                shoutoutChannelId: typeof parsed.shoutoutChannelId === 'string' ? parsed.shoutoutChannelId : undefined,
                socialsChannelId: typeof parsed.socialsChannelId === 'string' ? parsed.socialsChannelId : undefined,
            };

            return merged;
        } catch (error) {
            signale.fatal(`Failed to load feature toggles: ${error}`);
            return defaults;
        }
    }

    private saveFeatureToggles() {
        try {
            fs.writeFileSync(this._featureTogglesPath, JSON.stringify(this._featureToggles, null, 4));
        } catch (error) {
            signale.fatal(`Failed to save feature toggles: ${error}`);
        }
    }

    async main() {
        this._discordClient.on(Events.ClientReady, this.handleClientReady.bind(this));
        this._discordClient.on(Events.GuildMemberAdd, this.handleGuildMemberAdd.bind(this));
        this._discordClient.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => this.handleGuildMemberRemove(member));
        this._discordClient.on(Events.GuildBanAdd, this.handleGuildBanAdd.bind(this));
        this._discordClient.on(Events.GuildBanRemove, this.handleGuildBanRemove.bind(this));
        this._discordClient.on(Events.MessageCreate, this.handleMessageCreate.bind(this));
        this._discordClient.on(Events.InteractionCreate, this.handleInteractionCreate.bind(this));

        await this._discordClient.login(this._discordToken);

        while (!this._discordClient.isReady()) {
            await sleep(100);
        }

        new Cron('*/10 * * * *', this.updateMemberCount.bind(this));
    }

    private handleClientReady(c: Client<true>) {
        this._discordClient.user?.setActivity(undefined);
        this._rooms.set(Rooms.HYPETRAIN, this.getChannel(process.env.ROOMNAME ?? '🚀┃hypetrain'));
        this._rooms.set(Rooms.DEBUG, this.getChannel(process.env.DEBUGROOMNAME ?? 'debug_prod'));
        this._rooms.set(Rooms.SHOUTOUT, this.getChannelById(this._featureToggles.shoutoutChannelId) ?? this.getChannel(process.env.SHOUTOUTROOMNAME ?? 'shoutout'));
        this._rooms.set(Rooms.SOCIALS, this.getChannelById(this._featureToggles.socialsChannelId) ?? this.getChannel(process.env.SOCIALSROOMNAME ?? '💬┃general-chat'));
        this._rooms.set(Rooms.MODLOG, this.getChannel(process.env.MODLOGROONAME ?? '🚨┃mod-logs'));
        this._rooms.set(Rooms.STATS, (this._discordClient.channels.cache.get(STATS_ROOM) as TextChannel));
        this._rooms.set(Rooms.INTRO, (this._discordClient.channels.cache.get(INTRO_ROOM) as TextChannel));
        this._memberCount = (this._discordClient.guilds.cache.get(ANNABEL_DC) as Guild).memberCount;
        signale.debug(`Member count: ${this._memberCount}`);
        this.sendMessage(`Ready! Logged in as ${c.user.tag}`, Rooms.DEBUG);
        signale.success(`Ready! Logged in as ${c.user.tag}`);

        void this.registerSlashCommands();
    }

    private async registerSlashCommands() {
        if (!this._discordClient.user) {
            return;
        }

        const commands = [
            new SlashCommandBuilder()
                .setName('ig')
                .setDescription('Enable/disable Instagram posting')
                .setContexts(InteractionContextType.Guild)
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
                .addStringOption((opt) =>
                    opt
                        .setName('action')
                        .setDescription('Choose action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'on', value: 'on' },
                            { name: 'off', value: 'off' },
                            { name: 'status', value: 'status' },
                        )
                ),
            new SlashCommandBuilder()
                .setName('stickynote')
                .setDescription('Enable/disable intro sticky note')
                .setContexts(InteractionContextType.Guild)
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
                .addStringOption((opt) =>
                    opt
                        .setName('action')
                        .setDescription('Choose action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'on', value: 'on' },
                            { name: 'off', value: 'off' },
                            { name: 'status', value: 'status' },
                        )
                ),
            new SlashCommandBuilder()
                .setName('setchannel')
                .setDescription('Change target channel for a feature')
                .setContexts(InteractionContextType.Guild)
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
                .addStringOption((opt) =>
                    opt
                        .setName('feature')
                        .setDescription('Which feature channel to change')
                        .setRequired(true)
                        .addChoices(
                            { name: 'SHOUTOUT', value: 'SHOUTOUT' },
                            { name: 'SOCIALS', value: 'SOCIALS' },
                        )
                )
                .addChannelOption((opt) =>
                    opt
                        .setName('channel')
                        .setDescription('The new target channel (leave empty to reset to default)')
                        .addChannelTypes(ChannelType.GuildText)
                ),
        ].map((c) => c.toJSON());

        try {
            const rest = new REST().setToken(this._discordToken);
            await rest.put(
                Routes.applicationGuildCommands(this._discordClient.user.id, ANNABEL_DC),
                { body: commands },
            );
            signale.success('Registered slash commands: /ig, /stickynote, /setchannel');
        } catch (error) {
            signale.fatal(`Failed to register slash commands: ${error}`);
        }
    }

    private async handleGuildMemberAdd(member: GuildMember) {
        if (member.guild.id === ANNABEL_DC) {
            const user = member.user;
            await this.sendMessage(`${this.buildUserDetail(user)} joined the Server`, Rooms.MODLOG);
            this._memberCount = member.guild.memberCount;
            signale.debug(`Member count: ${this._memberCount}`);
        }
    }

    private async handleGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
        if (member.guild.id === ANNABEL_DC) {
            const user = member.user;
            const guild = member.guild;
            this._memberCount = member.guild.memberCount;
            signale.debug(`Member count: ${this._memberCount}`);
            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberKick);

            if (auditEntry) {
                const executorMessage = auditEntry.executor?.tag
                    ? ` by **${auditEntry.executor.tag}**`
                    : '';

                const reasonMessage = auditEntry.reason
                    ? `\n**Reason:** ${auditEntry.reason}`
                    : '';

                await this.sendMessage(`:foot: ${this.buildUserDetail(user)} was kicked from the server${executorMessage}.${reasonMessage}`, Rooms.MODLOG);
            } else {
                await this.sendMessage(`:wave: ${this.buildUserDetail(user)} left the server.`, Rooms.MODLOG);
            }
        }
    }

    private async handleGuildBanAdd(guildBan: GuildBan) {
        if (guildBan.guild.id === ANNABEL_DC) {
            const guild = guildBan.guild;
            const user = guildBan.user;
            this._memberCount = guild.memberCount;
            signale.debug(`Member count: ${this._memberCount}`);
            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberBanAdd)
            const executorMessage = auditEntry && auditEntry.executor?.tag
                ? ` by **${auditEntry.executor.tag}**`
                : '';

            const reasonMessage = auditEntry && auditEntry.reason
                ? `\n**Reason:** ${auditEntry.reason}`
                : '';

            await this.sendMessage(`:no_entry: ${this.buildUserDetail(user)} was banned${executorMessage}.${reasonMessage}`, Rooms.MODLOG);
        }
    }

    private async handleGuildBanRemove(guildBan: GuildBan) {
        if (guildBan.guild.id === ANNABEL_DC) {
            const guild = guildBan.guild;
            const user = guildBan.user;
            this._memberCount = guild.memberCount;
            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberBanRemove);
            const executorMessage = auditEntry && auditEntry.executor?.tag
                ? ` by **${auditEntry.executor.tag}**`
                : '';

            await this.sendMessage(`:ok: ${this.buildUserDetail(user)} was unbanned${executorMessage}.`, Rooms.MODLOG);
        }
    }

    private async handleMessageCreate(message: Message) {
        if (message.author.bot) {
            return;
        }

        if (message.channel.id === INTRO_ROOM && this._featureToggles.stickyNoteEnabled) {
            const lastCustomMessage = await this.findLastStickyNote();
            if (lastCustomMessage) {
                try {
                    await lastCustomMessage.delete();
                } catch (error) {
                    signale.fatal('Error deleting previous custom message:', error);
                }
            }
            this.sendMessage(STICKY_NOTE, Rooms.INTRO);
        }
    }

    private async handleInteractionCreate(interaction: unknown) {
        if (!(interaction instanceof ChatInputCommandInteraction)) {
            return;
        }

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.commandName === 'setchannel') {
            await this.handleSetChannel(interaction);
            return;
        }

        const action = interaction.options.getString('action', true);
        if (interaction.commandName === 'ig') {
            await this.handleIgToggle(interaction, action);
            return;
        }

        if (interaction.commandName === 'stickynote') {
            await this.handleStickyToggle(interaction, action);
            return;
        }
    }

    private async handleIgToggle(interaction: ChatInputCommandInteraction, action: 'on' | 'off' | 'status' | string) {
        if (action === 'status') {
            await interaction.reply({
                content: `Instagram posting: ${this._featureToggles.instagramPostingEnabled ? 'ON' : 'OFF'}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (action === 'on') {
            this._featureToggles.instagramPostingEnabled = true;
            this.saveFeatureToggles();
            await interaction.reply({ content: 'Instagram posting is now ON.', flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set Instagram posting to **ON**.`, Rooms.MODLOG);
            return;
        }

        if (action === 'off') {
            this._featureToggles.instagramPostingEnabled = false;
            this.saveFeatureToggles();
            await interaction.reply({ content: 'Instagram posting is now OFF.', flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set Instagram posting to **OFF**.`, Rooms.MODLOG);
            return;
        }

        await interaction.reply({ content: 'Invalid action. Use on/off/status.', flags: MessageFlags.Ephemeral });
    }

    private async handleStickyToggle(interaction: ChatInputCommandInteraction, action: 'on' | 'off' | 'status' | string) {
        if (action === 'status') {
            await interaction.reply({ content: `Sticky note: ${this._featureToggles.stickyNoteEnabled ? 'ON' : 'OFF'}`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (action === 'on') {
            this._featureToggles.stickyNoteEnabled = true;
            this.saveFeatureToggles();
            await interaction.reply({ content: 'Sticky note is now ON.', flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set Sticky note to **ON**.`, Rooms.MODLOG);

            // Immediately (re)post the sticky note
            const lastCustomMessage = await this.findLastStickyNote();
            if (lastCustomMessage) {
                try {
                    await lastCustomMessage.delete();
                } catch (error) {
                    signale.fatal('Error deleting previous custom message:', error);
                }
            }
            this.sendMessage(STICKY_NOTE, Rooms.INTRO);
            return;
        }

        if (action === 'off') {
            this._featureToggles.stickyNoteEnabled = false;
            this.saveFeatureToggles();
            await interaction.reply({ content: 'Sticky note is now OFF.', flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set Sticky note to **OFF**.`, Rooms.MODLOG);

            // Immediately remove the last sticky note
            const lastCustomMessage = await this.findLastStickyNote();
            if (lastCustomMessage) {
                try {
                    await lastCustomMessage.delete();
                } catch (error) {
                    signale.fatal('Error deleting previous custom message:', error);
                }
            }
            return;
        }

        await interaction.reply({ content: 'Invalid action. Use on/off/status.', flags: MessageFlags.Ephemeral });
    }

    private async handleSetChannel(interaction: ChatInputCommandInteraction) {
        const feature = interaction.options.getString('feature', true) as 'SHOUTOUT' | 'SOCIALS';
        const channel = interaction.options.getChannel('channel') as TextChannel | null;

        // If no channel provided, reset to default
        if (!channel) {
            if (feature === 'SHOUTOUT') {
                this._featureToggles.shoutoutChannelId = undefined;
                const defaultChannel = this.getChannel(process.env.SHOUTOUTROOMNAME ?? 'shoutout');
                this._rooms.set(Rooms.SHOUTOUT, defaultChannel);
                this.saveFeatureToggles();
                const channelInfo = defaultChannel ? channelMention(defaultChannel.id) : '(not found)';
                await interaction.reply({ content: `SHOUTOUT channel reset to default: ${channelInfo}`, flags: MessageFlags.Ephemeral });
                await this.sendMessage(`${this.buildUserDetail(interaction.user)} reset **SHOUTOUT** channel to default: ${channelInfo}`, Rooms.MODLOG);
            } else {
                this._featureToggles.socialsChannelId = undefined;
                const defaultChannel = this.getChannel(process.env.SOCIALSROOMNAME ?? '💬┃general-chat');
                this._rooms.set(Rooms.SOCIALS, defaultChannel);
                this.saveFeatureToggles();
                const channelInfo = defaultChannel ? channelMention(defaultChannel.id) : '(not found)';
                await interaction.reply({ content: `SOCIALS channel reset to default: ${channelInfo}`, flags: MessageFlags.Ephemeral });
                await this.sendMessage(`${this.buildUserDetail(interaction.user)} reset **SOCIALS** channel to default: ${channelInfo}`, Rooms.MODLOG);
            }
            return;
        }

        // Set the new channel
        if (feature === 'SHOUTOUT') {
            this._featureToggles.shoutoutChannelId = channel.id;
            this._rooms.set(Rooms.SHOUTOUT, channel);
            this.saveFeatureToggles();
            await interaction.reply({ content: `SHOUTOUT channel set to ${channelMention(channel.id)}`, flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set **SHOUTOUT** channel to ${channelMention(channel.id)}`, Rooms.MODLOG);
        } else {
            this._featureToggles.socialsChannelId = channel.id;
            this._rooms.set(Rooms.SOCIALS, channel);
            this.saveFeatureToggles();
            await interaction.reply({ content: `SOCIALS channel set to ${channelMention(channel.id)}`, flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set **SOCIALS** channel to ${channelMention(channel.id)}`, Rooms.MODLOG);
        }
    }

    private async updateMemberCount() {
        if (this._discordClient.isReady()) {
            const room = this._rooms.get(Rooms.STATS)!;
            signale.info(`cron`, this._memberCount, `A-Team: ${this._memberCount} members`);
            if (this.botHasPermission(room, PermissionsBitField.Flags.ManageChannels)) {
                room.setName(`A-Team: ${this._memberCount} members`);
            } else {
                this.sendMessage(`Help! i can't set name of <${room}>`, Rooms.DEBUG);
            }
        }
    }

    private getChannel(room: string) {
        return this._discordClient.channels.cache.find(
            (channel) => (channel as TextChannel).name === room,
        ) as TextChannel | VoiceChannel | null;
    }

    private getChannelById(id: string | undefined): TextChannel | null {
        if (!id) return null;
        const channel = this._discordClient.channels.cache.get(id);
        return channel?.type === ChannelType.GuildText ? (channel as TextChannel) : null;
    }

    async sendMessage(message: string | MessagePayload | MessageCreateOptions, room: Rooms) {
        DiscordMessageQueue.add(() => this.messageQueue(message, room));
    }

    async onlineHandler(message: string) {
        if (this._discordClient.isReady()) {
            this._discordClient.user?.setActivity({ name: "ΛNNΛBEL", type: ActivityType.Watching })
            this.sendMessage(message, Rooms.DEBUG)
        }
    }

    async offlineHandler(message: string) {
        if (this._discordClient.isReady()) {
            this._discordClient.user?.setActivity(undefined);
            this.sendMessage(message, Rooms.DEBUG)
        }
    }

    buildUserDetail(user: User): string {
        return `[${userMention(user.id)} \`${user.id}\`] **${user.username}**`
    }

    async fetchAuditEntryFor(guild: Guild, user: User, type: AuditLogEvent) {
        await sleep(2_500);
        const auditLogs = await guild.fetchAuditLogs({
            limit: 10,
            type
        }).catch(signale.debug)

        if (!auditLogs) {
            return null;
        }

        return auditLogs.entries.find((entry) => (entry.target as User).id == user.id);
    }

    private async messageQueue(message: string | MessagePayload | MessageCreateOptions, room: Rooms) {
        if (this._discordClient.isReady()) {
            const target = this._rooms.get(room);
            if (this.botHasPermission(target!, PermissionsBitField.Flags.SendMessages)) {
                if (typeof message === "string") {
                    if (message.includes('The hype train cool down ends')) {
                        this._lastCoolDownMessage = await target?.send(message);
                    } else {
                        await target?.send(message);
                    }
                } else {
                    await target?.send(message);
                }
            } else {
                signale.error(`Help! i can't post in <${room}>`);
                this.sendMessage(`Help! i can't post in <${room}>`, Rooms.DEBUG);
            }
        }
        await sleep(750);
    }

    deleteCoolDown() {
        if (this._discordClient.isReady()) {
            this._lastCoolDownMessage?.delete();
        }
    }

    async sendIgPost(element: InstagramMediaItem): Promise<void> {
        if (!this._featureToggles.instagramPostingEnabled) {
            this.sendMessage('Instagram posting is disabled; skipping sendIgPost', Rooms.DEBUG);
            return;
        }
        const url = this.hasProp(element, "thumbnail_url") ? element.thumbnail_url : element.media_url
        const blob = await fetch(url!).then((r) => r.blob());
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const file = new AttachmentBuilder(buffer, { name: 'preview.jpg' });
        const embed = new EmbedBuilder()
            .setTitle(element.permalink?.includes('/reel/') ? 'Annabel shared a new reel!' : 'Annabel shared a new post!')
            .setURL(element.permalink)
            .setDescription(this.hasProp(element, "caption") ? this.replaceInstagramHandles(element.caption!) : null)
            .setImage('attachment://preview.jpg')
            .setColor("#D300C5")
            .setFooter({
                text: 'Instagram',
            })
            .setTimestamp();
        this.sendMessage({ content: `${roleMention(CONTENT_ROLE)}`, embeds: [embed], files: [file] }, Rooms.SOCIALS);
    }

    private hasProp(obj: unknown, prop: string): boolean {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    private botHasPermission(channel: TextChannel | VoiceChannel | null, permissions: bigint) {
        if (channel?.guild) {
            return channel.permissionsFor(channel?.guild.members.me!)?.has(permissions);
        }
        return false;
    }

    replaceInstagramHandles(caption: string): string {
        let shortened = '';
        const maxLength = 100;
        if (caption.length <= maxLength) {
            shortened = caption;
        } else {
            const words = caption.split(' ');

            for (let word of words) {
                if ((shortened + word).length + 1 > maxLength) {
                    break;
                }
                shortened += (shortened ? ' ' : '') + word;
            }

            shortened += '...';
        }
        const handleRegex = /@([a-zA-Z0-9_]+)/g;

        const updatedCaption = shortened.replace(handleRegex, (match, handle) => {
            return `[${match}](https://www.instagram.com/${handle}/)`;
        });

        return updatedCaption;
    }

    async findLastStickyNote() {
        try {
            const messages = await this._rooms.get(Rooms.INTRO)?.messages.fetch({ limit: 10 });
            return messages?.find(msg => msg.author.id === this._discordClient.user?.id && msg.content === STICKY_NOTE);
        } catch (error) {
            signale.fatal('Error fetching messages:', error);
        }
        return null;
    }
}
