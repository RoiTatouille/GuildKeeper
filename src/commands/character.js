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
    )

    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Affiche tes perso')
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

                const character = characterService.addCharacter(
                    player.id,
                    name,
                    level
                );

                await interaction.reply({
                    content: `Personnage **${character.name}** ajoute (niveau ${character.level}) (ID: ${character.id})`,
                    ephemeral: true
                });
                break;
            }

            case 'list': {
                const characters = characterService.listCharacters(player.id);

                if (characters.length === 0) {
                    await interaction.reply({
                        content: 'Tu ne possedes aucun perso',
                        ephemeral: true
                    });
                    break;
                }

                const characterList = characters
                    .map(character =>
                        `**${character.name}** — Niveau ${character.level} (ID: ${character.id})`
                    )
                    .join('\n');

                await interaction.reply({
                    content: `**Tes personnages :**\n${characterList}`,
                    ephemeral: true
                });
                break;
            }

            case 'edit': {
                const characterId = interaction.options.getInteger('id');
                const name = interaction.options.getString('name');
                const level = interaction.options.getInteger('level');

                if (name === null && level === null) {
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
                        ...(level !== null && { level })
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