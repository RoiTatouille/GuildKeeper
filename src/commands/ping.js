import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('intendant')
        .setDescription('Vérifie que GuildKeeper fonctionne.'),

    async execute(interaction) {
        await interaction.reply({
            content: 'Intendant prêt !',
            ephemeral: true
        });
    }
};