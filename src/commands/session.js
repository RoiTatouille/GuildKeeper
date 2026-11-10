import { SlashCommandBuilder } from 'discord.js';
import { sessionService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('session')
        .setDescription('Gérer les sessions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('propose')
                .setDescription('Réserver un créneau pour une quête')
                .addIntegerOption(option =>
                    option
                        .setName('quest')
                        .setDescription('Identifiant de la quête')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption(option =>
                    option
                        .setName('slot')
                        .setDescription('Identifiant du créneau')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction) {
        const questId = interaction.options.getInteger('quest');
        const slotId = interaction.options.getInteger('slot');

        try {
            const reservation = sessionService.proposeSession(
                interaction.guildId,
                questId,
                slotId,
                interaction.user.id
            );

            const startsAt = Math.floor(new Date(reservation.startsAt).getTime() / 1000);
            const endsAt = Math.floor(new Date(reservation.endsAt).getTime() / 1000);

            let message = [
                `**Session réservée : ${reservation.questTitle}**`,
                `Créneau : <t:${startsAt}:F> → <t:${endsAt}:t>`,
                `Participants : ${reservation.playerCount}`
            ].join('\n');

            if (reservation.warnings.length > 0) {
                message += '\n\n**Attention aux personnages sous le niveau requis**';

                for (const warning of reservation.warnings) {
                    const characters = warning.characters
                        .map(character => `${character.name} (niveau ${character.level})`)
                        .join(', ');

                    message += `\n<@${warning.discordUserId}> : ${characters}`;
                }
            }

            await interaction.reply({
                content: message
            });
        } catch (error) {
            await interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }
    }
};