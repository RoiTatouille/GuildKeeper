import { SlashCommandBuilder } from 'discord.js';
import { playerService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('player')
        .setDescription('info de joueur')

        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('statistiques du joueur')
                .addUserOption(option =>
                    option
                        .setName('player')
                        .setDescription('Voir les stats du joueur')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
          try {
            const targetUser = interaction.options.getUser('player');
            const isPlayerRegistered = targetUser !== null;

            const targetPlayer = isPlayerRegistered
                ? playerService.getPlayerStats(interaction.guildId, targetUser.id)
                : playerService.getOrCreatePlayer(
                    interaction.guildId,
                    interaction.user.id
                );

            const targetMember = isPlayerRegistered
                ? await interaction.guild.members.fetch(targetUser.id)
                : interaction.member;

            const displayName = targetMember.displayName;

            if (!targetPlayer) {
                await interaction.reply({
                    content: `**${displayName}** n'est pas actif dans la guilde`,
                    ephemeral: false
                });
                return;
            }

            await interaction.reply({
                content: [
                    `**Statistiques de ${displayName}**`,
                    '',
                    `Sessions jouées : **${targetPlayer.sessionsPlayed}**`,
                    `XP accumulée : **${targetPlayer.totalXp}**`
                ].join('\n'),
                ephemeral: !isPlayerRegistered
            });
        } catch (error) {
            console.error('Player command error:', error);
            await interaction.reply({
                content: 'Une erreur est survenue',
                ephemeral: true
            });
        }
    }
};