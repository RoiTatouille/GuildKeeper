import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { runMigrations } from './database/migrationRunner.js';
import { setDiscordClient } from './adapters/discordQuestPublisher.js';

if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is missing from .env');
}

await runMigrations();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});
setDiscordClient(client);

const commands = await loadCommands();

client.once('ready', () => {
    console.log(`GuildKeeper is online as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing /${interaction.commandName}:`, error);

        const response = {
            content: 'Une erreur est survenue lors de cette commande.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);