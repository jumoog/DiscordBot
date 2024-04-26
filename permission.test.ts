import { sleep } from "bun";
import { beforeAll, expect, test } from "bun:test";
import { Client, GatewayIntentBits, PermissionsBitField, TextChannel, VoiceChannel } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

beforeAll(async () => {
    // login discord
    client.login(process.env.DISCORDTOKEN);
    while (!client.isReady()) {
        await sleep(1000);
    }
});

test("permission CreateInstantInvite", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.CreateInstantInvite)).toBe(true);
});

test("permission ManageChannels", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ManageChannels)).toBe(true);
});

test("permission AddReactions", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.AddReactions)).toBe(true);
});

test("permission ViewAuditLog", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ViewAuditLog)).toBe(true);
});

test("permission PrioritySpeaker", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.PrioritySpeaker)).toBe(true);
});

test("permission Stream", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.Stream)).toBe(true);
});

test("permission ViewChannel", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ViewChannel)).toBe(true);
});

test("permission SendMessages", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("permission ManageMessages", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ManageMessages)).toBe(true);
});

test("permission EmbedLinks", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.EmbedLinks)).toBe(true);
});

test("permission AttachFiles", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.AttachFiles)).toBe(true);
});

test("permission ReadMessageHistory", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ReadMessageHistory)).toBe(true);
});

test("permission MentionEveryone", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.MentionEveryone)).toBe(true);
});

test("permission UseExternalEmojis", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseExternalEmojis)).toBe(true);
});

test("permission Connect", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.Connect)).toBe(true);
});

test("permission Speak", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.Speak)).toBe(true);
});

test("permission MuteMembers", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.MuteMembers)).toBe(true);
});

test("permission DeafenMembers", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.DeafenMembers)).toBe(true);
});

test("permission UseVAD", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseVAD)).toBe(true);
});

test("permission ChangeNickname", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ChangeNickname)).toBe(true);
});

test("permission ManageNicknames", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ManageNicknames)).toBe(true);
});

test("permission UseApplicationCommands", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseApplicationCommands)).toBe(true);
});

test("permission RequestToSpeak", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.RequestToSpeak)).toBe(true);
});

test("permission ManageThreads", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.ManageThreads)).toBe(true);
});

test("permission CreatePublicThreads", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.CreatePublicThreads)).toBe(true);
});

test("permission CreatePrivateThreads", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.CreatePrivateThreads)).toBe(true);
});

test("permission UseExternalStickers", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseExternalStickers)).toBe(true);
});

test("permission SendMessagesInThreads", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.SendMessagesInThreads)).toBe(true);
});

test("permission UseEmbeddedActivities", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseEmbeddedActivities)).toBe(true);
});

test("permission UseSoundboard", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseSoundboard)).toBe(true);
});

test("permission UseExternalSounds", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.UseExternalSounds)).toBe(true);
});

test("permission SendVoiceMessages", () => {
    expect(checkBotPermissions(PermissionsBitField.Flags.SendVoiceMessages)).toBe(true);
});

// member stats room 
test("check if member stats room is manageable", () => {
    expect(getChannelByID("1189573435710521345")?.manageable).toBe(true);
});

test("change room title of member stats", () => {
    expect(botHasPermission("1189573435710521345", PermissionsBitField.Flags.ManageChannels)).toBe(true);
});

// 🚨┃bot-debug
test("<🚨┃bot-debug> Find channel by id", () => {
    expect(getChannelByID("1189878283899244626")?.name).toBe("🚨┃bot-debug");
});

test("<🚨┃bot-debug> Send a message", () => {
    expect(botHasPermission("1189878283899244626", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

// 🚀┃hypetrain
test("<🚀┃hypetrain> Find channel by id", () => {
    expect(getChannelByID("1060572257824546969")?.name).toBe("🚀┃hypetrain");
});

test("<🚀┃hypetrain> Send a message", () => {
    expect(botHasPermission("1060572257824546969", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("<🚀┃hypetrain> Deleting a message", () => {
    expect(botHasPermission("1060572257824546969", PermissionsBitField.Flags.ManageMessages)).toBe(true);
});

// 🔴┃live
test("<🔴┃live> Find channel by id", () => {
    expect(getChannelByID("975822791741947984")?.name).toBe("🔴┃live");
});

test("<🔴┃live> Send a message", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("<🔴┃live> Attach Files", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.AttachFiles)).toBe(true);
});

test("<🔴┃live> Embed Links", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.EmbedLinks)).toBe(true);
});

test("<🔴┃live> Mention Everyone", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.MentionEveryone)).toBe(true);
});

// 💬┃general-chat
test("<💬┃general-chat> Find channel by id", () => {
    expect(getChannelByID("821710074577158144")?.name).toBe("💬┃general-chat");
});

test("<💬┃general-chat> Send a message", () => {
    expect(botHasPermission("821710074577158144", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("<💬┃general-chat> Attach Files", () => {
    expect(botHasPermission("821710074577158144", PermissionsBitField.Flags.AttachFiles)).toBe(true);
});

test("<💬┃general-chat> Embed Links", () => {
    expect(botHasPermission("821710074577158144", PermissionsBitField.Flags.EmbedLinks)).toBe(true);
});

test("<💬┃general-chat> Mention Everyone in", () => {
    expect(botHasPermission("821710074577158144", PermissionsBitField.Flags.MentionEveryone)).toBe(true);
});

// 🚨┃mod-logs
test("<🚨┃mod-logs> Send a message", () => {
    expect(botHasPermission("1229478102066008196", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

function botHasPermission(schannel: string, permissions: bigint) {
    // Replace 'YOUR_BOT_ID' with your actual bot's user ID
    const channel = getChannelByID(schannel);
    // Check if the channel is a GuildChannel (text or voice channel)
    if (channel?.guild) {
        // Check if the bot has the 'SEND_MESSAGES' permission in the channel
        return channel.permissionsFor(channel?.guild.members.me!)?.has(permissions);
    }

    // If the channel is not a GuildChannel, return false
    return false;
}

function getChannelByID(room: string) {
    return client.channels.cache.find(
        (channel) => (channel as TextChannel).id === room
    ) as TextChannel | VoiceChannel | null;
}

function checkBotPermissions(permission: bigint) {
    const guildId = "821708215216635904";
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
        // Get the member object for the bot itself
        const botMember = guild.members.cache.get(client.user?.id!);
        //fs.writeFileSync('lol.json', JSON.stringify(botMember?.permissions.toArray()!))
        return botMember?.permissions.has(permission);
    }
    return false;
}
