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
        ),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        try {
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
        } catch (error) {
            await interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }
    }
};