import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createQuestService(questRepository) {
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

        if (!Number.isSafeInteger(xpReward) || xpReward < 0) {
            throw new Error('XP erroné');
        }

        if (!Number.isSafeInteger(minLevel) || minLevel < 1) {
            throw new Error('Le niveau minimum doit être >= 1');
        }

        if (!Number.isSafeInteger(maxPlayers) || maxPlayers < 1) {
            throw new Error('nombre maximum de joueurs doit être >= 1');
        }
    }

    function createQuest(discordGuildId, createdByDiscordId, data) {
        validateDiscordId(discordGuildId);
        validateDiscordId(createdByDiscordId);
        validateQuestData(data);

        return questRepository.create(
            discordGuildId,
            data.title.trim(),
            data.description.trim(),
            data.requirements?.trim() || null,
            data.xpReward,
            data.minLevel,
            data.maxPlayers,
            createdByDiscordId
        );
    }

    function editQuest(discordGuildId, questId, data) {
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
            maxPlayers: data.maxPlayers ?? quest.maxPlayers
        };

        validateQuestData(updatedData);

        return questRepository.update(
            discordGuildId,
            questId,
            updatedData.title.trim(),
            updatedData.description.trim(),
            updatedData.requirements,
            updatedData.xpReward,
            updatedData.minLevel,
            updatedData.maxPlayers
        );
    }

    function cancelQuest(discordGuildId, questId) {
        validateDiscordId(discordGuildId);
        validateQuestId(questId);

        const quest = questRepository.findById(discordGuildId, questId);

        if (!quest) {
            throw new Error(`Cette quête n'existe pas`);
        }

        if (quest.status !== 'OPEN') {
            throw new Error(`je ne peux l'annuler`);
        }

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