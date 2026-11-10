import { SlashCommandBuilder } from 'discord.js';
import { availabilityService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('availability')
        .setDescription('Gère les disponibilités du MJ.')

        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un créneau de dispo')
                .addStringOption(option =>
                    option
                        .setName('start')
                        .setDescription('Début : AAAA-MM-JJ HH:mm')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('end')
                        .setDescription('Fin : AAAA-MM-JJ HH:mm')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Désactive un créneau')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Identifiant du créneau')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Modifie un créneau')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Identifiant du créneau')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('start')
                        .setDescription('Nouveau début : AAAA-MM-JJ HH:mm')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('end')
                        .setDescription('Nouvelle fin : AAAA-MM-JJ HH:mm')
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche les créneaux actifs')
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'add': {
                    const start = interaction.options.getString('start');
                    const end = interaction.options.getString('end');

                    const slot = availabilityService.addAvailability(
                        interaction.guildId,
                        start,
                        end,
                        interaction.user.id
                    );

                    await interaction.reply({
                        content: [
                            `**Créneau #${slot.id} ajouté !**`,
                            '',
                            `Début : ${start}`,
                            `Fin : ${end}`
                        ].join('\n'),
                        ephemeral: true
                    });
                    break;
                }

                case 'edit': {
                    const slotId = interaction.options.getInteger('id');
                    const start = interaction.options.getString('start');
                    const end = interaction.options.getString('end');

                    const slot = availabilityService.editAvailability(
                        interaction.guildId,
                        slotId,
                        start ?? undefined,
                        end ?? undefined
                    );

                    if (!slot) {
                        await interaction.reply({
                            content: `Aucun créneau actif #${slotId} n'a été trouvé`,
                            ephemeral: true
                        });
                        break;
                    }

                    await interaction.reply({
                        content: [
                            `**Créneau #${slot.id} modifié !**`,
                            '',
                            `Début : ${slot.startsAtFormatted}`,
                            `Fin : ${slot.endsAtFormatted}`
                        ].join('\n'),
                        ephemeral: true
                    });
                    break;
                }

                case 'remove': {
                    const slotId = interaction.options.getInteger('id');

                    const removed = availabilityService.removeAvailability(
                        interaction.guildId,
                        slotId
                    );

                    await interaction.reply({
                        content: removed
                            ? `Le créneau **#${slotId}** a été désactivé`
                            : `Aucun créneau actif **#${slotId}** n'a été trouvé`,
                        ephemeral: true
                    });
                    break;
                }

                case 'list': {
                    const result = availabilityService.listAvailability(
                        interaction.guildId
                    );

                    if (result.slots.length === 0) {
                        await interaction.reply({
                            content: 'Aucun créneau de disponibilité actif',
                            ephemeral: false
                        });
                        break;
                    }

                    const slotList = result.slots.map(slot =>
                        [
                            `**Créneau #${slot.id}**`,
                            `Début : ${slot.startsAtFormatted}`,
                            `Fin : ${slot.endsAtFormatted}`
                        ].join('\n')
                    ).join('\n\n');

                    await interaction.reply({
                        content: [
                            `**Disponibilités du MJ**`,
                            `Fuseau horaire : \`${result.timezone}\``,
                            '',
                            slotList
                        ].join('\n'),
                        ephemeral: false
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Availability command error:', error);

            await interaction.reply({
                content: `${error.message || 'Une erreur est survenue'}`,
                ephemeral: true
            });
        }
    }
};