import { formatQuestContent } from '../utils/formatQuestContent.js';
import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createQuestService(
    questRepository,
    guildRepository,
    questPublisher
) {
    function validateQuestId(questId) {
        if (!Number.isSafeInteger(questId) || questId <= 0) {
            throw new Error('Identifiant de quête invalide');
        }
    }

    function validateQuestData({
        title,
        description,
        requirements,
        xpReward,
        minLevel,
        minPlayers,
        maxPlayers
    }) {
        if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) {
            throw new Error('Le titre doit contenir entre 1 et 100 caractères');
        }

        if (
            typeof description !== 'string' ||
            !description.trim() ||
            description.trim().length > 4000
        ) {
            throw new Error('La description doit contenir entre 1 et 4000 caractères');
        }

        if (
            requirements !== null &&
            requirements !== undefined &&
            (typeof requirements !== 'string' || requirements.trim().length > 1000)
        ) {
            throw new Error('Les prérequis ne peuvent pas dépasser 1000 caractères');
        }

        if (formatQuestContent({
            description,
            requirements,
            minLevel,
            minPlayers,
            maxPlayers,
            xpReward
        }).length > 2000) {
            throw new Error('Le contenu de la quête dépasse la limite de 2000 caracteres');
        }

        if (!Number.isSafeInteger(xpReward) || xpReward < 0) {
            throw new Error('XP erroné');
        }

        if (!Number.isSafeInteger(minLevel) || minLevel < 1) {
            throw new Error('Le niveau minimum doit être >= 1');
        }

        if (!Number.isSafeInteger(maxPlayers) || maxPlayers < 1) {
            throw new Error('nombre maximum de joueurs doit être >= 1');
        }

        if (!Number.isSafeInteger(minPlayers) || minPlayers < 1) {
            throw new Error('Le nombre minimum de joueurs doit être >= 1');
        }
        if (minPlayers > maxPlayers) {
            throw new Error('Le nombre minimum de joueurs est supérieur au maximum');
        }
    }

    async function createQuest(discordGuildId, createdByDiscordId, data) {
        validateDiscordId(discordGuildId);
        validateDiscordId(createdByDiscordId);
        validateQuestData(data);

        const quest = questRepository.create(
            discordGuildId,
            data.title.trim(),
            data.description.trim(),
            data.requirements?.trim() || null,
            data.xpReward,
            data.minLevel,
            data.minPlayers,
            data.maxPlayers,
            createdByDiscordId
        );

        const guild = guildRepository.findByDiscordId(discordGuildId);

        if (!guild?.activeQuestsChannelId) {
            questRepository.cancel(discordGuildId, quest.id);
            throw new Error('Aucun salon de quêtes configuré');
        }

        let discordMessageId = null;

        try {
            discordMessageId = await questPublisher.publishQuest(
                discordGuildId,
                guild.activeQuestsChannelId,
                quest
            );

            const saved = questRepository.setDiscordMessageId(
                discordGuildId,
                quest.id,
                discordMessageId
            );

            if (!saved) {
                throw new Error('Impossible d’enregistrer le post Discord');
            }

            return questRepository.findById(discordGuildId, quest.id);
        } catch (error) {
            if (discordMessageId) {
                try {
                    await questPublisher.deleteQuestPost(
                        guild.activeQuestsChannelId,
                        discordMessageId
                    );
                } catch (cleanupError) {
                    console.error('Impossible de supprimer le post Discord :', cleanupError);
                }
            }

            questRepository.cancel(discordGuildId, quest.id);

            throw new Error(`Échec de publication de la quête : ${error.message}`);
        }
    }

    async function editQuest(discordGuildId, questId, data) {
        validateDiscordId(discordGuildId);
        validateQuestId(questId);

        const quest = questRepository.findById(discordGuildId, questId);

        if (!quest) {
            throw new Error(`Cette quête n'existe pas`);
        }

        if (quest.status !== 'OPEN') {
            throw new Error('Seules les quêtes ouvertes peuvent être modifier');
        }

        const updatedData = {
            title: data.title ?? quest.title,
            description: data.description ?? quest.description,
            requirements: data.requirements ?? quest.requirements,
            xpReward: data.xpReward ?? quest.xpReward,
            minLevel: data.minLevel ?? quest.minLevel,
            minPlayers: data.minPlayers ?? quest.minPlayers,
            maxPlayers: data.maxPlayers ?? quest.maxPlayers
        };

        validateQuestData(updatedData);

        const guild = guildRepository.findByDiscordId(discordGuildId);

        if (!guild?.activeQuestsChannelId || !quest.discordMessageId) {
            throw new Error('Impossible de retrouver le post Discord de cette quête');
        }

        const normalizedData = {
            ...updatedData,
            title: updatedData.title.trim(),
            description: updatedData.description.trim(),
            requirements: updatedData.requirements?.trim() || null
        };

        await questPublisher.updateQuestPost(
            discordGuildId,
            guild.activeQuestsChannelId,
            quest.discordMessageId,
            {
                ...quest,
                ...normalizedData
            }
        );

        questRepository.update(
            discordGuildId,
            questId,
            normalizedData.title,
            normalizedData.description,
            normalizedData.requirements,
            normalizedData.xpReward,
            normalizedData.minLevel,
            normalizedData.minPlayers,
            normalizedData.maxPlayers
        );

        return questRepository.findById(discordGuildId, questId);
    }

    async function cancelQuest(discordGuildId, questId) {
        validateDiscordId(discordGuildId);
        validateQuestId(questId);

        const quest = questRepository.findById(discordGuildId, questId);

        if (!quest) {
            throw new Error(`Cette quête n'existe pas`);
        }

        if (quest.status !== 'OPEN') {
            throw new Error(`je ne peux l'annuler`);
        }

        const guild = guildRepository.findByDiscordId(discordGuildId);

        if (!guild?.activeQuestsChannelId || !quest.discordMessageId) {
            throw new Error('Impossible de retrouver le post');
        }

        await questPublisher.cancelQuestPost(
            discordGuildId,
            guild.activeQuestsChannelId,
            quest.discordMessageId
        );

        return questRepository.cancel(discordGuildId, questId);
    }

    function listQuests(discordGuildId) {
        validateDiscordId(discordGuildId);

        return questRepository.findAllByGuild(discordGuildId);
    }

    return {
        createQuest,
        editQuest,
        cancelQuest,
        listQuests
    };
}