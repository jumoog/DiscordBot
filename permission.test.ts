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

test("find id <📸┃socials>", () => {
    expect(getChannelByID("1125885420379586660")?.name).toBe("📸┃socials");
});

test("find id <🔴┃live>", () => {
    expect(getChannelByID("975822791741947984")?.name).toBe("🔴┃live");
});

test("find id <🚀┃hypetrain>", () => {
    expect(getChannelByID("1060572257824546969")?.name).toBe("🚀┃hypetrain");
});

test("find id <🚨┃bot-debug>", () => {
    expect(getChannelByID("1189878283899244626")?.name).toBe("🚨┃bot-debug");
});

test("check if member stats room is manageable", () => {
    expect(getChannelByID("1189573435710521345")?.manageable).toBe(true);
});

test("send a message in <📸┃socials>", () => {
    expect(botHasPermission("1125885420379586660", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("send a message in <🔴┃live>", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("send a message in <🚀┃hypetrain>", () => {
    expect(botHasPermission("1060572257824546969", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("deleting a message in <🚀┃hypetrain>", () => {
    expect(botHasPermission("1060572257824546969", PermissionsBitField.Flags.ManageMessages)).toBe(true);
});

test("send a message in <🚨┃bot-debug>", () => {
    expect(botHasPermission("1189878283899244626", PermissionsBitField.Flags.SendMessages)).toBe(true);
});

test("change room title of member stats", () => {
    expect(botHasPermission("1189573435710521345", PermissionsBitField.Flags.ManageChannels)).toBe(true);
});

test("Attach Files in <🔴┃live>", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.AttachFiles)).toBe(true);
});

test("Embed Links in <🔴┃live>", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.EmbedLinks)).toBe(true);
});

test("Mention Everyone in <🔴┃live>", () => {
    expect(botHasPermission("975822791741947984", PermissionsBitField.Flags.MentionEveryone)).toBe(true);
});

function botHasPermission(schannel: string, permissions: bigint) {
    // Replace 'YOUR_BOT_ID' with your actual bot's user ID
    const channel = getChannelByID(schannel);
    // Check if the channel is a GuildChannel (text or voice channel)
    if (channel?.guild) {
        // Check if the bot has the 'SEND_MESSAGES' permission in the channel
        return channel.permissionsFor(client.user?.id!)?.has(permissions);
    }

    // If the channel is not a GuildChannel, return false
    return false;
}

function getChannelByID(room: string) {
    return client.channels.cache.find(
        (channel) => (channel as TextChannel).id === room,
    ) as TextChannel | VoiceChannel | null;
}
