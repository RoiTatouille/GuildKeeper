import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { guildMasterService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('guildmaster')
        .setDescription('Manage GM')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('add to GM')
                .addUserOption(option =>
                    option
                        .setName('player')
                        .setDescription('player to promote')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('remove a GM')
                .addUserOption(option =>
                    option
                        .setName('player')
                        .setDescription('player to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('show GM list')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('player');

        try {
            switch (subcommand) {
                case 'add': {
                    const added = guildMasterService.addGuildMaster(user.id);

                    await interaction.reply({
                        content: added
                            ? `${user} est maintenant maitre de guilde`
                            : `${user} est déjà maître de guilde`,
                        allowedMentions: {
                            users: []
                        }
                    });
                    break;
                }

                case 'remove': {
                    const removed = guildMasterService.removeGuildMaster(user.id);

                    await interaction.reply({
                        content: removed
                            ? `${user} n'est plus maître de guilde`
                            : `${user} n'étais pas maître de guilde`,
                        allowedMentions: {
                            users: []
                        }
                    });
                    break;
                }

                case 'list': {
                    const guildMasters = guildMasterService.getAllGuildMasters();

                    await interaction.reply({
                        content: guildMasters.length > 0
                            ? `**Maîtres de guilde :**\n${guildMasters.map(guildMaster => `<@${guildMaster.discordUserId}>`).join('\n')}`
                            : 'Aucun maître de guilde',
                        allowedMentions: {
                            users: []
                        }
                    });
                    break;
                }
            }
        } catch (error) {
            await interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }
    }
};