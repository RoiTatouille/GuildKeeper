import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createSessionService(sessionRepository) {
    function validateId(value, name) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`${name} invalide`);
        }
    }

    function proposeSession(discordGuildId, questId, slotId, reservedByDiscordId) {
        validateDiscordId(discordGuildId);
        validateDiscordId(reservedByDiscordId);
        validateId(questId, 'Identifiant de quête');
        validateId(slotId, 'Identifiant de créneau');

        const quest = sessionRepository.findQuestById(discordGuildId, questId);

        if (!quest || quest.status !== 'OPEN') {
            throw new Error('Cette quête n’est pas disponible à la réservation');
        }

        const participants = sessionRepository.findParticipantsByQuestId(questId);

        if (participants.length === 0) {
            throw new Error('Aucun joueur n’est inscrit à cette quête');
        }

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

        if (players.size > quest.maxPlayers) {
            throw new Error('Le nombre de joueurs inscrits dépasse la limite de cette quête');
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
            throw new Error('Ce créneau n’est pas disponible');
        }

        if (sessionRepository.isSlotReserved(slotId)) {
            throw new Error('Ce créneau est déjà réservé');
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
                throw new Error('La quête ou le créneau n’est plus disponible');
            }

            return {
                ...reservation,
                questTitle: quest.title,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                warnings
            };
        } catch (error) {
            if (
                error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
            ) {
                throw new Error('Cette quête ou ce créneau vient d’être réservé');
            }

            throw error;
        }
    }

    return {
        proposeSession
    };
}