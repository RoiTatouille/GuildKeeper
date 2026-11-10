import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('fakecreatequest')
        .setDescription('Test auto deploy command'),

    async execute(interaction) {
        await interaction.reply({
            content: 'Auto deploy command ok !',
            ephemeral: true
        });
    }
};