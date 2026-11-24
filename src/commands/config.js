import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { guildService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configurer GuildKeeper')
        .addSubcommand(subcommand =>
            subcommand
                .setName('quest_channel')
                .setDescription('Définir le forum de quetes')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon forum des quêtes')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildForum)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('general_channel')
                .setDescription('Définir le salon des annonces')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon des annonces')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');

        try {
            switch (subcommand) {
                case 'quest_channel':
                    if (channel.type !== ChannelType.GuildForum) {
                        throw new Error('Le salon doit être un forum');
                    }

                    guildService.setActiveQuestsChannel(
                        interaction.guildId,
                        channel.id
                    );

                    await interaction.reply({
                        content: `Salon des quêtes configuré : ${channel}`
                    });
                    break;

                case 'general_channel':
                    if (channel.type !== ChannelType.GuildText) {
                        throw new Error('Le salon doit être un salon textuel');
                    }

                    guildService.setGeneralChannel(
                        interaction.guildId,
                        channel.id
                    );

                    await interaction.reply({
                        content: `Salon des annonces configuré : ${channel}`
                    });
                    break;
            }
        } catch (error) {
            await interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }
    }
};