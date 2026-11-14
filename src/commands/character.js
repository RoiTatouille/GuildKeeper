import { SlashCommandBuilder } from 'discord.js';
import { playerService, characterService } from '../container.js';

export default {
data: new SlashCommandBuilder()
.setName('character')
.setDescription('Gere tes personnages')

    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Ajoute un personnage')
            .addStringOption(option =>
                option
                    .setName('name')
                    .setDescription('Nom du perso')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('level')
                    .setDescription('Niveau du perso')
                    .setMinValue(1)
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('class')
                    .setDescription('Classe du perso')
            )
            .addStringOption(option =>
                option
                    .setName('rank')
                    .setDescription('Rang du perso')
            )
    )

    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Affiche tes perso')
            .addUserOption(option =>
                option
                    .setName('player')
                    .setDescription('Voir les perso du joueur')
                    .setRequired(false)
            )
    )

    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Modifie un perso')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('Identifiant du perso')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('name')
                    .setDescription('Nouveau nom')
                    .setRequired(false)
            )
            .addIntegerOption(option =>
                option
                    .setName('level')
                    .setDescription('Nouveau niveau')
                    .setMinValue(1)
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('class')
                    .setDescription('Nouvelle classe du perso')
            )
            .addStringOption(option =>
                option
                    .setName('rank')
                    .setDescription('Nouveau rang du perso')
            )
    )

    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Supprime un perso')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('Identifiant du perso')
                    .setRequired(true)
            )
    ),

async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    const player = playerService.getOrCreatePlayer(
        interaction.guildId,
        interaction.user.id
    );

    try {
        switch (subcommand) {
            case 'add': {
                const name = interaction.options.getString('name');
                const level = interaction.options.getInteger('level') ?? 1;
                const characterClass = interaction.options.getString('class');
                const rank = interaction.options.getString('rank');

                const character = characterService.addCharacter(
                    player.id,
                    name,
                    level,
                    characterClass,
                    rank
                );

                await interaction.reply({
                    content: `Personnage **${character.name}** ajoute (niveau ${character.level}) (ID: ${character.id})`,
                    ephemeral: true
                });
                break;
            }

            case 'list': {
                const targetUser = interaction.options.getUser('player');
                const isPlayerRegistered = targetUser !== null;

                const targetPlayer = isPlayerRegistered
                    ? playerService.getPlayerStats(interaction.guildId, targetUser.id)
                    : player;

                if (!targetPlayer) {
                    await interaction.reply({
                        content: `**${targetUser.displayName}** N'est pas actif dans la guilde`,
                        ephemeral: false
                    });
                    break;
                }

                const characters = characterService.listCharacters(targetPlayer.id);

                if (characters.length === 0) {
                    await interaction.reply({
                        content: isPlayerRegistered
                            ? `**${targetUser.displayName}** a 0 perso`
                            : `t'as 0 perso`,
                        ephemeral: !isPlayerRegistered
                    });
                    break;
                }

                const displayName = isPlayerRegistered
                    ? targetUser.displayName
                    : interaction.member.displayName;

                const characterList = characters
                    .map(character => [
                        `#${character.id} - ${character.name}`,
                        `Niveau ${character.level}`,
                        character.class ? `Classe ${character.class}` : null,
                        character.rank ? `Rang ${character.rank}` : null
                    ].filter(Boolean).join(' - '))
                    .join('\n');

                await interaction.reply({
                    content: [
                        `**Personnages de ${displayName} :**`,
                        '',
                        characterList,
                        '',
                        `*${characters.length} personnages*`
                    ].join('\n'),
                    ephemeral: !isPlayerRegistered
                });
                break;
            }

            case 'edit': {
                const characterId = interaction.options.getInteger('id');
                const name = interaction.options.getString('name');
                const level = interaction.options.getInteger('level');
                const characterClass = interaction.options.getString('class');
                const rank = interaction.options.getString('rank');

                if (
                    name === null &&
                    level === null &&
                    characterClass === null &&
                    rank === null
                ) {
                    await interaction.reply({
                        content: 'Tu dois fournir un nouveau nom ou un niveau',
                        ephemeral: true
                    });
                    break;
                }

                const character = characterService.editCharacter(
                    player.id,
                    characterId,
                    {
                        ...(name !== null && { name }),
                        ...(level !== null && { level }),
                        ...(characterClass !== null && { class: characterClass }),
                        ...(rank !== null && { rank })
                    }
                );

                if (!character) {
                    await interaction.reply({
                        content: 'Personnage introuvable',
                        ephemeral: true
                    });
                    break;
                }

                await interaction.reply({
                    content: `Personnage modifié : **${character.name}**, niveau ${character.level}`,
                    ephemeral: true
                });
                break;
            }

            case 'delete': {
                const characterId = interaction.options.getInteger('id');

                const character = characterService.getCharacterByIds(player.id ,characterId)

                const deleted = characterService.deleteCharacter(
                    player.id,
                    characterId
                );

                await interaction.reply({
                    content: deleted
                        ? `**${character.name}** à rendu l'ame au niveau ${character.level}`
                        : 'Personnage introuvable',
                    ephemeral: true
                });
                break;
            }
        }
    } catch (error) {
        console.error('Character command error:', error);

        await interaction.reply({
            content: 'Une erreur est survenue lors de la gestion de ton perso',
            ephemeral: true
        });
    }
}

};