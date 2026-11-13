import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createSessionService(sessionRepository, questPublisher) {
    function validateId(value, name) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`${name} invalide`);
        }
    }

    async function proposeSession(
        discordGuildId,
        questId,
        slotId,
        reservedByDiscordId,
        participantIds
    ) {

        validateDiscordId(discordGuildId);
        validateDiscordId(reservedByDiscordId);
        validateId(questId, 'Identifiant de quête');
        validateId(slotId, 'Identifiant de créneau');

        if (!Array.isArray(participantIds) || participantIds.length === 0) {
            throw new Error('Aucun participant renseigné');
        }

        for (const participantId of participantIds) {
            validateDiscordId(participantId);
        }

        if (new Set(participantIds).size !== participantIds.length) {
            throw new Error(`Un participant ne peut être indiqué qu'une fois`);
        }

        const quest = sessionRepository.findQuestById(discordGuildId, questId);

        if (!quest || quest.status !== 'OPEN') {
            throw new Error(`Cette quête n'est pas disponible à la réservation`);
        }

        const reactionUserIds = await questPublisher.getQuestReactionUserIds(
            discordGuildId,
            quest.activeQuestsChannelId,
            quest.discordMessageId
        );

        const suppliedIds = new Set(participantIds);
        const reactedIds = new Set(reactionUserIds);

        const missingReactions = participantIds.filter(
            id => !reactedIds.has(id)
        );

        const missingParticipants = reactionUserIds.filter(
            id => !suppliedIds.has(id)
        );

        //DEBUG
        console.log('Quête :', {
            id: questId,
            discordMessageId: quest.discordMessageId,
            channelId: quest.activeQuestsChannelId
        });

        console.log('Participants fournis :', participantIds);
        console.log('Réactions récupérées :', reactionUserIds);
        console.log('Réactions manquantes :', missingReactions);
        console.log('Participants supplémentaires :', missingParticipants);

        if (missingReactions.length > 0 || missingParticipants.length > 0) {
            throw new Error(
                'La liste des participants ne correspond pas exactement aux réactions ✅ de la quête'
            );
        }

        const participants = sessionRepository.findPlayersByDiscordUserIds(
            discordGuildId,
            participantIds
        );

        const players = new Map();

        for (const participant of participants) {
            if (!players.has(participant.playerId)) {
                players.set(participant.playerId, {
                    playerId: participant.playerId,
                    discordUserId: participant.discordUserId,
                    characters: []
                });
            }

            if (participant.characterId !== null) {
                players.get(participant.playerId).characters.push({
                    id: participant.characterId,
                    name: participant.characterName,
                    level: participant.characterLevel
                });
            }
        }

        if (players.size !== participantIds.length) {
            const registeredIds = new Set(
                [...players.values()].map(player => player.discordUserId)
            );

            const unregisteredIds = participantIds.filter(
                id => !registeredIds.has(id)
            );

            throw new Error(
                `Les joueurs suivants ne sont pas enregistrés : ${unregisteredIds.map(id => `<@${id}>`).join(', ')}`
            );
        }

        if (players.size < quest.minPlayers) {
            throw new Error('Le nombre de participants est inférieur au minimum requis');
        }

        if (players.size > quest.maxPlayers) {
            throw new Error('Le nombre de participants dépasse la limite de cette quête');
        }

        const warnings = [];

        for (const player of players.values()) {
            const eligibleCharacters = player.characters.filter(
                character => character.level >= quest.minLevel
            );

            if (eligibleCharacters.length === 0) {
                throw new Error(
                    `Le joueur <@${player.discordUserId}> ne possède aucun personnage de niveau ${quest.minLevel} ou supérieur`
                );
            }

            const underleveledCharacters = player.characters.filter(
                character => character.level < quest.minLevel
            );

            if (underleveledCharacters.length > 0) {
                warnings.push({
                    discordUserId: player.discordUserId,
                    characters: underleveledCharacters
                });
            }
        }

        const slot = sessionRepository.findActiveSlotById(discordGuildId, slotId);

        if (!slot) {
            throw new Error(`Ce créneau n'est pas disponible`);
        }

        try {
            const reservation = sessionRepository.createReservation(
                quest.guildId,
                questId,
                slotId,
                reservedByDiscordId,
                [...players.keys()]
            );

            if (!reservation) {
                throw new Error(`La quête ou le créneau n'est plus disponible`);
            }

            let discordWarning = null;

            try {
                await questPublisher.markQuestInProgress(
                    discordGuildId,
                    quest.activeQuestsChannelId,
                    quest.discordMessageId
                );
            } catch (error) {
                console.error('Impossible de mettre à jour le tag Discord :', error);
                discordWarning = 'La réservation est confirmée mais le tagest incorrect';
            }

            return {
                ...reservation,
                questTitle: quest.title,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                warnings,
                discordWarning
            };
        } catch (error) {
            if (
                error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
            ) {
                throw new Error(`Cette quête ou ce créneau vient d'être réservé`);
            }

            throw error;
        }
    }

    return {
        proposeSession
    };
}
