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
                .addStringOption(option =>
                    option
                        .setName('participants')
                        .setDescription('mentions participants pour inscrire')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        ),

    async execute(interaction) {
        const questId = interaction.options.getInteger('quest');
        const slotId = interaction.options.getInteger('slot');
        const participantsInput = interaction.options.getString('participants');

        const mentions = [...participantsInput.matchAll(/<@!?(\d+)>/g)];
        const remainingInput = participantsInput.replace(/<@!?\d+>/g, '').trim();

        if (mentions.length === 0 || remainingInput.length > 0) {
            return interaction.reply({
                content: 'Indique les participants uniquement avec leurs mentions Discord',
                ephemeral: true
            });
        }

        const participantIds = mentions.map(mention => mention[1]);

        if (new Set(participantIds).size !== participantIds.length) {
            return interaction.reply({
                content: `Un participant ne peut être ajouté qu'une fois`,
                ephemeral: true
            });
        }

        try {
            const reservation = await sessionService.proposeSession(
                interaction.guildId,
                questId,
                slotId,
                interaction.user.id,
                participantIds
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

            if (reservation.discordWarning) {
                message += `\n\n${reservation.discordWarning}`;
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