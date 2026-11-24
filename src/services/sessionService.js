import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createSessionService(sessionRepository, questPublisher, guildService) {
    function validateId(value, name) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`${name} invalide`);
        }
    }

    function validateDeaths(deathsInput, participantsRows) {
        if (deathsInput === null || deathsInput === undefined) {
            return [];
        }

        if (typeof deathsInput !== 'string') {
            throw new Error('La liste des décès est invalide');
        }

        if (deathsInput.trim() === '') {
            return [];
        }

        const participants = new Map();

        for (const row of participantsRows) {
            if (row.playerId === null) continue;

            if (!participants.has(row.discordUserId)) {
                participants.set(row.discordUserId, {
                    playerId: row.playerId,
                    characters: []
                });
            }

            if (row.characterId !== null) {
                participants.get(row.discordUserId).characters.push({
                    id: row.characterId,
                    name: row.characterName
                });
            }
        }

        const deaths = [];
        const deceasedCharacterIds = new Set();

        for (const entry of deathsInput.split(';')) {
            const match = entry.trim().match(/^<@!?(\d+)>\s*:\s*(.+)$/);

            if (!match) {
                throw new Error(`Format de décès invalide : ${entry.trim()}`);
            }

            const [, discordUserId, characterName] = match;
            const participant = participants.get(discordUserId);

            if (!participant) {
                throw new Error(`Le joueur <@${discordUserId}> ne participe pas à cette session`);
            }

            const matchingCharacters = participant.characters.filter(
                character => character.name.toLowerCase() === characterName.trim().toLowerCase()
            );

            if (matchingCharacters.length === 0) {
                throw new Error(
                    `Le personnage "${characterName.trim()}" n'appartient pas à <@${discordUserId}>`
                );
            }

            if (matchingCharacters.length > 1) {
                throw new Error(
                    `Plusieurs personnages de <@${discordUserId}> portent le nom "${characterName.trim()}"`
                );
            }

            const character = matchingCharacters[0];

            if (deceasedCharacterIds.has(character.id)) {
                throw new Error(`Le personnage "${character.name}" est indiqué plusieurs fois`);
            }

            deceasedCharacterIds.add(character.id);

            deaths.push({
                playerId: participant.playerId,
                discordUserId,
                characterId: character.id,
                characterName: character.name
            });
        }

        return deaths;
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
            throw new Error('Aucun participant');
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
                discordWarning = 'La réservation est confirmée mais le tag est incorrect';
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

    function listScheduledSessions(discordGuildId) {
        validateDiscordId(discordGuildId);

        const sessionsRows = sessionRepository.findAllScheduledSessions(discordGuildId);
        const sessions = new Map();

        for (const row of sessionsRows) {
            if (!sessions.has(row.id)) {
                sessions.set(row.id, {
                    id: row.id,
                    questTitle: row.questTitle,
                    startsAt: row.startsAt,
                    endsAt: row.endsAt,
                    reservedByDiscordId: row.reservedByDiscordId,
                    status: 'SCHEDULED',
                    participants: []
                });
            }

            if (row.discordUserId !== null) {
                sessions.get(row.id).participants.push({
                    discordUserId: row.discordUserId,
                    status: row.playerStatus
                });
            }
        }

        return [...sessions.values()];
    }

    async function cancelSession(discordGuildId, sessionId) {
        validateDiscordId(discordGuildId);
        validateId(sessionId, 'Identifiant de session');

        const session = sessionRepository.findSessionToCancel(discordGuildId, sessionId);

        if (!session) {
            throw new Error(`Cette session n'existe pas ou n'est plus réservée`);
        }

        const cancellation = sessionRepository.cancelReservation(discordGuildId, sessionId);

        if (!cancellation) {
            throw new Error(`Cette session n'est plus annulable`);
        }

        let discordWarning = null;

        try {
            await questPublisher.markQuestAvailable(
                discordGuildId,
                session.activeQuestsChannelId,
                session.discordMessageId
            );
        } catch (error) {
            console.error('Impossible de remettre à jour le post Discord :', error);
            discordWarning = `La session est annulée mais le post Discord n'a pas été update`;
        }

        return {
            ...cancellation,
            questTitle: session.questTitle,
            discordWarning
        };
    }

    async function completeSession(discordGuildId, sessionId, deathsInput = '') {
        validateDiscordId(discordGuildId);
        validateId(sessionId, 'Identifiant de session');

        const guild = guildService.getGuild(discordGuildId);

        if (!guild?.generalChannelId) {
            throw new Error(`Aucun salon général n'est configuré avec /config`);
        }

        const participantsRows = sessionRepository.findSessionForCompletion(
            discordGuildId,
            sessionId
        );

        if (participantsRows.length === 0) {
            throw new Error("Cette session n'existe pas ou n'est plus réservée");
        }

        const deaths = validateDeaths(deathsInput, participantsRows);

        const completion = sessionRepository.completeSession(
            discordGuildId,
            sessionId
        );

        if (!completion) {
            throw new Error("Cette session n'est plus terminable");
        }

        const warnings = [];

        try {
            await questPublisher.publishSessionRecap(discordGuildId, completion);
        } catch (error) {
            console.error('Échec de publication du récapitulatif XP :', error);
            warnings.push(`Le récapitulatif XP n'a pas pu être publié`);
        }

        try {
            await questPublisher.publishSessionAnnouncement(
                discordGuildId,
                {
                    ...completion,
                    generalChannelId: guild.generalChannelId
                },
                deaths
            );
        } catch (error) {
            console.error(`Échec de publication de fin de session :`, error);
            warnings.push(`L'annonce de fin de session n'a pas pu être publiée`);
        }

        return {
            ...completion,
            deaths,
            warnings
        };
    }

    return {
        proposeSession,
        listScheduledSessions,
        cancelSession,
        completeSession
    };
}
