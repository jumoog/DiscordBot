
import { Client, GatewayIntentBits } from 'discord.js';


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {

    // Replace 'YOUR_GUILD_ID' with your actual guild ID
    const guildId = '821708215216635904';

    // Replace 'YOUR_ROLE_ID' with your actual role ID
    const roleId = '821816412850749440';

    try {
        // Fetch the guild
        const guild = await client.guilds.fetch(guildId);

        // Fetch the role
        const role = await guild.roles.fetch(roleId);

        const currentPermissions = role?.permissions.toArray();

        currentPermissions?.push('Administrator');

        // Update the role permissions
        await role?.setPermissions(currentPermissions!);

        console.log(`Admin rights added to the role ${role?.name}`);
    } catch (error) {
        console.error('Error updating role permissions:', error);
    }
});

// login discord
client.login("TOKEN");