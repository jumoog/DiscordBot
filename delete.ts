
import { Channel, Client, Events, GatewayIntentBits } from 'discord.js';

const channelId = "1125885420379586660";
const messageId = "1129706733942616084";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, _c => {
    client.channels.fetch(channelId).then((channel: Channel | null) => {
        if (channel?.isTextBased()) {
            channel.messages.delete(messageId);
        }
    });
});

// login discord
client.login("TOKEN");


