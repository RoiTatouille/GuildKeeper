import { SlashCommandBuilder } from 'discord.js';
import { questService } from '../container.js';

export default {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Gérer les quêtes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Créer une quête active')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Titre de la quête')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description de la quête')
                        .setRequired(true)
                        .setMaxLength(4000)
                )
                .addIntegerOption(option =>
                    option
                        .setName('xp')
                        .setDescription('Récompense en XP')
                        .setRequired(true)
                        .setMinValue(0)
                )
                .addIntegerOption(option =>
                    option
                        .setName('max_players')
                        .setDescription('Nombre maximum de joueurs')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption(option =>
                    option
                        .setName('min_players')
                        .setDescription('Nombre minimum de joueurs')
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('requirements')
                        .setDescription('Prérequis de quête')
                        .setMaxLength(1000)
                )
                .addIntegerOption(option =>
                    option
                        .setName('min_level')
                        .setDescription('Niveau minimum requis')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Modifier une quête active')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Identifiant de la quête')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Nouveau titre')
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Nouvelle description')
                        .setMaxLength(4000)
                )
                .addStringOption(option =>
                    option
                        .setName('requirements')
                        .setDescription('Prérequis de quête')
                        .setMaxLength(1000)
                )
                .addIntegerOption(option =>
                    option
                        .setName('xp')
                        .setDescription('Nouvelle récompense XP')
                        .setMinValue(0)
                )
                .addIntegerOption(option =>
                    option
                        .setName('max_players')
                        .setDescription('Nouveau nombre maximum de joueurs')
                        .setMinValue(1)
                )
                .addIntegerOption(option =>
                    option
                        .setName('min_players')
                        .setDescription('Nombre minimum de joueurs')
                        .setMinValue(1)
                )
                .addIntegerOption(option =>
                    option
                        .setName('min_level')
                        .setDescription('Nouveau niveau minimum')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Annuler une quête active')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Identifiant de la quête')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Afficher les quêtes actives')
        ),


    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'create') {
                const quest = await questService.createQuest(
                    interaction.guildId,
                    interaction.user.id,
                    {
                        title: interaction.options.getString('title'),
                        description: interaction.options.getString('description'),
                        requirements: interaction.options.getString('requirements'),
                        xpReward: interaction.options.getInteger('xp'),
                        minLevel: interaction.options.getInteger('min_level') ?? 1,
                        minPlayers: interaction.options.getInteger('min_players') ?? 1,
                        maxPlayers: interaction.options.getInteger('max_players')
                    }
                );

                await interaction.reply({
                    content: [
                        `**Quête crée : ${quest.title}**`,
                        `Identifiant : ${quest.id}`,
                        `Récompense : ${quest.xpReward} XP`,
                        `Niveau minimum : ${quest.minLevel}`,
                        `Joueurs : ${quest.minPlayers} - ${quest.maxPlayers}`
                    ].join('\n')
                });

                return;
            }

            if (subcommand === 'edit') {
                const questId = interaction.options.getInteger('id');

                const quest = await questService.editQuest(
                    interaction.guildId,
                    questId,
                    {
                        title: interaction.options.getString('title'),
                        description: interaction.options.getString('description'),
                        requirements: interaction.options.getString('requirements'),
                        xpReward: interaction.options.getInteger('xp'),
                        minLevel: interaction.options.getInteger('min_level'),
                        minPlayers: interaction.options.getInteger('min_players'),
                        maxPlayers: interaction.options.getInteger('max_players')
                    }
                );

                await interaction.reply({
                    content: `Quête **${quest.title}** (#${quest.id}) modifié`
                });

                return;
            }

            if (subcommand === 'cancel') {
                const questId = interaction.options.getInteger('id');

                await questService.cancelQuest(interaction.guildId, questId);

                await interaction.reply({
                    content: `Quête #${questId} annulé`
                });

                return;
            }

            if (subcommand === 'list') {
                const quests = questService.listQuests(interaction.guildId);

                if (quests.length === 0) {
                    await interaction.reply({
                        content: 'Aucune quête sur ce serveur',
                        ephemeral: true
                    });

                    return;
                }

                const message = quests.map(quest => [
                    `**#${quest.id} — ${quest.title}**`,
                    `Statut : ${quest.status}`,
                    `XP : ${quest.xpReward}`,
                    `Niveau minimum : ${quest.minLevel}`,
                    `Joueurs : ${quest.minPlayers} - ${quest.maxPlayers}`,
                    `Requirement : ${quest.requirements !== null ? quest.requirements : ''}`,
                    `Description : ${quest.description}`
                ].join('\n')).join('\n\n');

                await interaction.reply({
                    content: message
                });
            }
        } catch (error) {
            await interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }
    }
};