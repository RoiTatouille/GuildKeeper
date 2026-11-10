import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';

if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is missing from .env');
}

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_GUILD_ID) {
    throw new Error('DISCORD_CLIENT_ID or DISCORD_GUILD_ID is missing from .env');
}

const commands = await loadCommands();

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

try {
    console.log(`Registering ${commands.size} GuildKeeper command(s)...`);

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.DISCORD_CLIENT_ID,
            process.env.DISCORD_GUILD_ID
        ),
        {
            body: [...commands.values()].map(command =>
                command.data.toJSON()
            )
        }
    );

    console.log('Commands registered successfully!');
} catch (error) {
    console.error('Failed to register commands:', error);
    process.exitCode = 1;
}