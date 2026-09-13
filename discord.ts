import EventEmitter from 'events';
import signale from "signale";
import fs from 'node:fs';
import { ActivityType, AttachmentBuilder, AuditLogEvent, ChannelType, ChatInputCommandInteraction, Client, codeBlock, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildAuditLogsEntry, GuildBan, GuildMember, PartialGuildMember, Interaction, Message, MessageCreateOptions, MessagePayload, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, TextChannel, User, VoiceChannel, userMention, roleMention, channelMention, InteractionContextType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import PQueue from 'p-queue';
import { InstagramMediaItem } from './Instagram.ts';
import { Cron } from "croner";
import { sleep } from 'bun';
import { registerProbe } from './health.ts';

const DiscordMessageQueue = new PQueue({ concurrency: 1 });

const ANNABEL_DC = "821708215216635904";
const STATS_ROOM = "1189573435710521345";
const CONTENT_ROLE = "953017309369344031";
const INTRO_ROOM = "821709936563191849";

/**
 * how far back an audit log entry may be to still count as the cause of a member leaving.
 * Entry timestamps come from Discord's clock, so leave generous room for host clock skew.
 */
const AUDIT_LOG_MAX_AGE_MS = 60_000;
/** how long a ban reported by handleGuildBanAdd suppresses the matching guildMemberRemove */
const REPORTED_BAN_TTL_MS = 60_000;
/** audit log entries show up with a small delay after the gateway event */
const AUDIT_LOG_DELAY_MS = 2_500;

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

type ToggleAction = 'on' | 'off' | 'status';

/** features whose target channel can be changed at runtime via /setchannel */
type ConfigurableRoom = Rooms.SHOUTOUT | Rooms.SOCIALS;

const CONFIGURABLE_ROOMS: Record<ConfigurableRoom, { toggleKey: 'shoutoutChannelId' | 'socialsChannelId'; envVar: string; defaultName: string }> = {
    [Rooms.SHOUTOUT]: { toggleKey: 'shoutoutChannelId', envVar: 'SHOUTOUTROOMNAME', defaultName: 'shoutout' },
    [Rooms.SOCIALS]: { toggleKey: 'socialsChannelId', envVar: 'SOCIALSROOMNAME', defaultName: '💬┃general-chat' },
};

type SendableChannel = TextChannel | VoiceChannel;

export class DiscordBot extends EventEmitter {
    private _discordToken: string;
    private _lastCoolDownMessage: Message | undefined;
    /** bumped for every new cool down notice so a stale queued notice can recognise it was superseded */
    private _coolDownGeneration = 0;
    private _coolDownActive = false;
    /** user ids whose ban was (or is being) reported by handleGuildBanAdd */
    private readonly _reportedBans = new Set<string>();
    private _discordClient: Client;
    private _rooms: Map<Rooms, SendableChannel | null>;
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
                // required for guildBanAdd / guildBanRemove
                GatewayIntentBits.GuildModeration,
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
        this._discordClient.on(Events.GuildMemberRemove, this.handleGuildMemberRemove.bind(this));
        this._discordClient.on(Events.GuildBanAdd, this.handleGuildBanAdd.bind(this));
        this._discordClient.on(Events.GuildBanRemove, this.handleGuildBanRemove.bind(this));
        this._discordClient.on(Events.MessageCreate, this.handleMessageCreate.bind(this));
        this._discordClient.on(Events.InteractionCreate, this.handleInteractionCreate.bind(this));

        // login() resolves once the token is accepted, not once the gateway session is ready
        const ready = new Promise<void>((resolve) => this._discordClient.once(Events.ClientReady, () => resolve()));
        await this._discordClient.login(this._discordToken);
        await ready;

        registerProbe('discord', () => this._discordClient.isReady());
        new Cron('*/10 * * * *', this.updateMemberCount.bind(this));
    }

    /**
     * flush pending messages and disconnect (graceful shutdown)
     */
    async shutdown() {
        await DiscordMessageQueue.onIdle();
        await this._discordClient.destroy();
    }

    private handleClientReady(c: Client<true>) {
        this._discordClient.user?.setActivity(undefined);
        this._rooms.set(Rooms.HYPETRAIN, this.getChannel(process.env.ROOMNAME ?? '🚀┃hypetrain'));
        this._rooms.set(Rooms.DEBUG, this.getChannel(process.env.DEBUGROOMNAME ?? 'debug_prod'));
        this._rooms.set(Rooms.SHOUTOUT, this.getChannelById(this._featureToggles.shoutoutChannelId) ?? this.getDefaultChannel(Rooms.SHOUTOUT));
        this._rooms.set(Rooms.SOCIALS, this.getChannelById(this._featureToggles.socialsChannelId) ?? this.getDefaultChannel(Rooms.SOCIALS));
        this._rooms.set(Rooms.MODLOG, this.getChannel(process.env.MODLOGROOMNAME ?? '🚨┃mod-logs'));
        this._rooms.set(Rooms.STATS, (this._discordClient.channels.cache.get(STATS_ROOM) as SendableChannel | undefined) ?? null);
        this._rooms.set(Rooms.INTRO, (this._discordClient.channels.cache.get(INTRO_ROOM) as TextChannel | undefined) ?? null);
        this._memberCount = this._discordClient.guilds.cache.get(ANNABEL_DC)?.memberCount ?? 0;
        signale.debug(`Member count: ${this._memberCount}`);
        this.sendMessage(`Ready! Logged in as ${c.user.tag}`, Rooms.DEBUG);
        signale.success(`Ready! Logged in as ${c.user.tag}`);

        void this.registerSlashCommands();
    }

    private async registerSlashCommands() {
        if (!this._discordClient.user) {
            return;
        }

        const toggleCommand = (name: string, description: string) =>
            new SlashCommandBuilder()
                .setName(name)
                .setDescription(description)
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
                );

        const commands = [
            toggleCommand('ig', 'Enable/disable Instagram posting'),
            toggleCommand('stickynote', 'Enable/disable intro sticky note'),
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
                            { name: 'Twitch Live Ping', value: Rooms.SHOUTOUT },
                            { name: 'Instagram Posts', value: Rooms.SOCIALS },
                        )
                )
                .addChannelOption((opt) =>
                    opt
                        .setName('channel')
                        .setDescription('The new target channel (leave empty to reset to default)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
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

            const since = Date.now() - AUDIT_LOG_MAX_AGE_MS;
            await sleep(AUDIT_LOG_DELAY_MS);

            // a ban also fires guildMemberRemove; handleGuildBanAdd reports it when the event arrives
            if (this._reportedBans.has(user.id)) {
                return;
            }

            // fallback: guildBanAdd did not arrive (e.g. missing intent), report the ban from the audit log instead
            const banEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberBanAdd, since);
            if (banEntry) {
                await this.reportBan(user, banEntry);
                return;
            }

            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberKick, since);
            if (auditEntry) {
                await this.sendMessage(`:foot: ${this.buildUserDetail(user)} was kicked from the server${this.formatExecutor(auditEntry)}.${this.formatReason(auditEntry)}`, Rooms.MODLOG);
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
            // claim the report synchronously so the concurrent guildMemberRemove handler backs off
            this._reportedBans.add(user.id);
            setTimeout(() => this._reportedBans.delete(user.id), REPORTED_BAN_TTL_MS);
            const since = Date.now() - AUDIT_LOG_MAX_AGE_MS;
            await sleep(AUDIT_LOG_DELAY_MS);
            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberBanAdd, since);

            await this.reportBan(user, auditEntry);
        }
    }

    private reportBan(user: User, auditEntry: GuildAuditLogsEntry | null) {
        return this.sendMessage(`:no_entry: ${this.buildUserDetail(user)} was banned${this.formatExecutor(auditEntry)}.${this.formatReason(auditEntry)}`, Rooms.MODLOG);
    }

    private async handleGuildBanRemove(guildBan: GuildBan) {
        if (guildBan.guild.id === ANNABEL_DC) {
            const guild = guildBan.guild;
            const user = guildBan.user;
            this._memberCount = guild.memberCount;
            const since = Date.now() - AUDIT_LOG_MAX_AGE_MS;
            await sleep(AUDIT_LOG_DELAY_MS);
            const auditEntry = await this.fetchAuditEntryFor(guild, user, AuditLogEvent.MemberBanRemove, since);

            await this.sendMessage(`:ok: ${this.buildUserDetail(user)} was unbanned${this.formatExecutor(auditEntry)}.`, Rooms.MODLOG);
        }
    }

    private async handleMessageCreate(message: Message) {
        if (message.author.bot) {
            return;
        }

        if (message.channel.id === INTRO_ROOM && this._featureToggles.stickyNoteEnabled) {
            await this.repostStickyNote();
        }
    }

    private async handleInteractionCreate(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
            return;
        }

        switch (interaction.commandName) {
            case 'setchannel':
                await this.handleSetChannel(interaction);
                break;
            case 'ig':
                await this.handleToggle(interaction, 'instagramPostingEnabled', 'Instagram posting');
                break;
            case 'stickynote': {
                const enabled = await this.handleToggle(interaction, 'stickyNoteEnabled', 'Sticky note');
                // apply the change immediately instead of waiting for the next intro message
                if (enabled === true) {
                    await this.repostStickyNote();
                } else if (enabled === false) {
                    await this.removeStickyNote();
                }
                break;
            }
        }
    }

    /**
     * handle an on/off/status command for a boolean feature toggle
     * @returns the new value when it was changed, otherwise undefined
     */
    private async handleToggle(interaction: ChatInputCommandInteraction, key: 'instagramPostingEnabled' | 'stickyNoteEnabled', label: string): Promise<boolean | undefined> {
        const action = interaction.options.getString('action', true) as ToggleAction;

        if (action === 'status') {
            await interaction.reply({ content: `${label}: ${this._featureToggles[key] ? 'ON' : 'OFF'}`, flags: MessageFlags.Ephemeral });
            return undefined;
        }

        if (action !== 'on' && action !== 'off') {
            await interaction.reply({ content: 'Invalid action. Use on/off/status.', flags: MessageFlags.Ephemeral });
            return undefined;
        }

        const enabled = action === 'on';
        this._featureToggles[key] = enabled;
        this.saveFeatureToggles();
        await interaction.reply({ content: `${label} is now ${enabled ? 'ON' : 'OFF'}.`, flags: MessageFlags.Ephemeral });
        await this.sendMessage(`${this.buildUserDetail(interaction.user)} set ${label} to **${enabled ? 'ON' : 'OFF'}**.`, Rooms.MODLOG);
        return enabled;
    }

    private async handleSetChannel(interaction: ChatInputCommandInteraction) {
        const feature = interaction.options.getString('feature', true) as ConfigurableRoom;
        const config = CONFIGURABLE_ROOMS[feature];
        if (!config) {
            await interaction.reply({ content: 'Unknown feature.', flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = interaction.options.getChannel('channel') as TextChannel | null;

        if (channel) {
            this._featureToggles[config.toggleKey] = channel.id;
            this._rooms.set(feature, channel);
            this.saveFeatureToggles();
            await interaction.reply({ content: `${feature} channel set to ${channelMention(channel.id)}`, flags: MessageFlags.Ephemeral });
            await this.sendMessage(`${this.buildUserDetail(interaction.user)} set **${feature}** channel to ${channelMention(channel.id)}`, Rooms.MODLOG);
            return;
        }

        // no channel provided: reset to default
        this._featureToggles[config.toggleKey] = undefined;
        const defaultChannel = this.getDefaultChannel(feature);
        this._rooms.set(feature, defaultChannel);
        this.saveFeatureToggles();
        const channelInfo = defaultChannel ? channelMention(defaultChannel.id) : '(not found)';
        await interaction.reply({ content: `${feature} channel reset to default: ${channelInfo}`, flags: MessageFlags.Ephemeral });
        await this.sendMessage(`${this.buildUserDetail(interaction.user)} reset **${feature}** channel to default: ${channelInfo}`, Rooms.MODLOG);
    }

    private async updateMemberCount() {
        if (!this._discordClient.isReady()) {
            return;
        }
        const room = this._rooms.get(Rooms.STATS);
        const name = `A-Team: ${this._memberCount} members`;
        signale.info(`cron`, this._memberCount, name);
        if (!this.botHasPermission(room, PermissionsBitField.Flags.ManageChannels)) {
            this.sendMessage(`Help! i can't set name of <${Rooms.STATS}>`, Rooms.DEBUG);
            return;
        }
        // channel renames are rate limited to 2 per 10 minutes, don't waste them on a no-op
        if (room.name !== name) {
            await room.setName(name).catch((error) => signale.error(`Failed to rename stats channel: ${error}`));
        }
    }

    private getChannel(room: string): SendableChannel | null {
        const channel = this._discordClient.channels.cache.find(
            (channel): channel is SendableChannel => channel.isTextBased() && !channel.isDMBased() && !channel.isThread() && channel.name === room,
        );
        return channel ?? null;
    }

    private getChannelById(id: string | undefined): TextChannel | null {
        if (!id) return null;
        const channel = this._discordClient.channels.cache.get(id);
        if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement) {
            return channel as TextChannel;
        }
        return null;
    }

    private getDefaultChannel(room: ConfigurableRoom): SendableChannel | null {
        const config = CONFIGURABLE_ROOMS[room];
        return this.getChannel(process.env[config.envVar] ?? config.defaultName);
    }

    /**
     * queue a message for delivery
     * @returns the sent message once it has been delivered (undefined when it could not be sent)
     */
    sendMessage(message: string | MessagePayload | MessageCreateOptions, room: Rooms): Promise<Message | undefined> {
        return DiscordMessageQueue.add(() => this.messageQueue(message, room));
    }

    /**
     * post the hype train cool down notice and remember it so it can be removed once the cool down is over
     */
    async sendCoolDownMessage(message: string) {
        const generation = ++this._coolDownGeneration;
        this._coolDownActive = true;
        // a notice from a previous cool down that is still around is obsolete now
        this.deleteMessage(this._lastCoolDownMessage);
        this._lastCoolDownMessage = undefined;

        const sent = await this.sendMessage(message, Rooms.HYPETRAIN);
        if (!sent) {
            return;
        }
        if (generation !== this._coolDownGeneration || !this._coolDownActive) {
            // the cool down ended (or a newer one started) while this notice was still queued
            this.deleteMessage(sent);
            return;
        }
        this._lastCoolDownMessage = sent;
    }

    onlineHandler(message: string) {
        if (this._discordClient.isReady()) {
            this._discordClient.user.setActivity({ name: "ΛNNΛBEL", type: ActivityType.Watching })
            this.sendMessage(message, Rooms.DEBUG)
        }
    }

    offlineHandler(message: string) {
        if (this._discordClient.isReady()) {
            this._discordClient.user.setActivity(undefined);
            this.sendMessage(message, Rooms.DEBUG)
        }
    }

    buildUserDetail(user: User): string {
        return `[${userMention(user.id)} \`${user.id}\`] **${user.username}**`
    }

    private formatExecutor(entry: GuildAuditLogsEntry | null | undefined): string {
        return entry?.executor?.tag ? ` by **${entry.executor.tag}**` : '';
    }

    private formatReason(entry: GuildAuditLogsEntry | null | undefined): string {
        return entry?.reason ? `\n**Reason:** ${entry.reason}` : '';
    }

    /**
     * find the most recent audit log entry of `type` targeting `user` that was created after `since`
     */
    private async fetchAuditEntryFor(guild: Guild, user: User, type: AuditLogEvent, since: number) {
        const auditLogs = await guild.fetchAuditLogs({
            limit: 10,
            type
        }).catch((error) => {
            signale.debug(`fetchAuditLogs failed: ${error}`);
            return null;
        });

        return auditLogs?.entries.find((entry) => entry.targetId === user.id && entry.createdTimestamp >= since) ?? null;
    }

    private async messageQueue(message: string | MessagePayload | MessageCreateOptions, room: Rooms): Promise<Message | undefined> {
        let sent: Message | undefined;
        if (this._discordClient.isReady()) {
            const target = this._rooms.get(room);
            if (this.botHasPermission(target, PermissionsBitField.Flags.SendMessages)) {
                try {
                    sent = await target.send(message);
                } catch (error) {
                    signale.error(`Failed to send message to <${room}>: ${error}`);
                }
            } else {
                signale.error(`Help! i can't post in <${room}>`);
                if (room !== Rooms.DEBUG) {
                    // not awaited: we are inside the queue, waiting would deadlock
                    this.sendMessage(`Help! i can't post in <${room}>`, Rooms.DEBUG);
                }
            }
        }
        await sleep(750);
        return sent;
    }

    deleteCoolDown() {
        this._coolDownActive = false;
        const message = this._lastCoolDownMessage;
        this._lastCoolDownMessage = undefined;
        this.deleteMessage(message);
    }

    private deleteMessage(message: Message | undefined) {
        if (this._discordClient.isReady() && message) {
            message.delete().catch((error) => signale.debug(`Failed to delete message ${message.id}: ${error}`));
        }
    }

    async sendIgPost(element: InstagramMediaItem): Promise<void> {
        if (!this._featureToggles.instagramPostingEnabled) {
            this.sendMessage('Instagram posting is disabled; skipping sendIgPost', Rooms.DEBUG);
            return;
        }
        const url = element.thumbnail_url ?? element.media_url;
        if (!url) {
            this.sendMessage('No media URL available for Instagram post', Rooms.DEBUG);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(element.permalink?.includes('/reel/') ? 'Annabel shared a new reel!' : 'Annabel shared a new post!')
            .setURL(element.permalink)
            .setDescription(element.caption ? this.replaceInstagramHandles(element.caption) : null)
            .setColor("#D300C5")
            .setFooter({
                text: 'Instagram',
            })
            .setTimestamp();

        // re-upload the preview so the embed survives Instagram's short-lived CDN links;
        // fall back to linking the image directly if the download fails
        const files: AttachmentBuilder[] = [];
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`status <${res.status}> statusText: <${res.statusText}>`);
            }
            files.push(new AttachmentBuilder(Buffer.from(await res.arrayBuffer()), { name: 'preview.jpg' }));
            embed.setImage('attachment://preview.jpg');
        } catch (error) {
            signale.error(`Failed to download Instagram preview: ${error}`);
            embed.setImage(url);
        }

        this.sendMessage({ content: `${roleMention(CONTENT_ROLE)}`, embeds: [embed], files }, Rooms.SOCIALS);
    }

    private botHasPermission(channel: SendableChannel | null | undefined, permissions: bigint): channel is SendableChannel {
        const me = channel?.guild.members.me;
        if (channel && me) {
            return channel.permissionsFor(me).has(permissions);
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

            for (const word of words) {
                if ((shortened + word).length + 1 > maxLength) {
                    break;
                }
                shortened += (shortened ? ' ' : '') + word;
            }

            shortened += '...';
        }
        // Instagram handles may contain letters, digits, underscores and periods
        const handleRegex = /@([a-zA-Z0-9_.]+)/g;

        return shortened.replace(handleRegex, (match, handle) => {
            return `[${match}](https://www.instagram.com/${handle}/)`;
        });
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

    /**
     * delete the current sticky note (if any) so it can be re-posted at the bottom of the channel
     */
    private async removeStickyNote() {
        const lastStickyNote = await this.findLastStickyNote();
        if (lastStickyNote) {
            try {
                await lastStickyNote.delete();
            } catch (error) {
                signale.fatal('Error deleting previous sticky note:', error);
            }
        }
    }

    private async repostStickyNote() {
        await this.removeStickyNote();
        this.sendMessage(STICKY_NOTE, Rooms.INTRO);
    }
}
