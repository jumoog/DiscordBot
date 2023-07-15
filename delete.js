import { Client, Events, GatewayIntentBits } from 'discord.js';
const channelId = "1125885420379586660";
const messageId = "1129706733942616084";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.once(Events.ClientReady, c => {
    client.channels.fetch(channelId).then((channel) => {
        channel.messages.delete(messageId);
    });
});
client.login("TOKEN");
