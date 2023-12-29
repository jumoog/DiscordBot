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

// 📸┃socials
test("<📸┃socials> Find channel by id", () => {
    expect(getChannelByID("1125885420379586660")?.name).toBe("📸┃socials");
});

test("<📸┃socials> Send a message", () => {
    expect(botHasPermission("1125885420379586660", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("<📸┃socials> Attach Files", () => {
    expect(botHasPermission("1125885420379586660", PermissionsBitField.Flags.AttachFiles)).toBe(true);
});

test("<📸┃socials> Embed Links", () => {
    expect(botHasPermission("1125885420379586660", PermissionsBitField.Flags.EmbedLinks)).toBe(true);
});

test("<📸┃socials> Mention Everyone in", () => {
    expect(botHasPermission("1125885420379586660", PermissionsBitField.Flags.MentionEveryone)).toBe(true);
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
        (channel) => (channel as TextChannel).id === room,
    ) as TextChannel | VoiceChannel | null;
}
