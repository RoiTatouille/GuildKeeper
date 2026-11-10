import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createPlayerService(playerRepository) {
    /**
     * Retrieves an existing player or creates one.
     */
    function getOrCreatePlayer(discordGuildId, discordUserId) {
        validateDiscordId(discordGuildId, 'discordGuildId');
        validateDiscordId(discordUserId, 'discordUserId');

        return playerRepository.getOrCreate(
            discordGuildId,
            discordUserId
        );
    }

    /**
     * Retrieves a player's statistics.
     */
    function getPlayerStats(discordGuildId, discordUserId) {
        validateDiscordId(discordGuildId, 'discordGuildId');
        validateDiscordId(discordUserId, 'discordUserId');

        return playerRepository.findByDiscordIds(
            discordGuildId,
            discordUserId
        );
    }

    return {
        getOrCreatePlayer,
        getPlayerStats
    };
}