import { validateDiscordId } from '../utils/validateDiscordId.js';

export function createGuildService(guildRepository) {
    function setActiveQuestsChannel(discordGuildId, channelId) {
        validateDiscordId(discordGuildId);
        validateDiscordId(channelId);

        guildRepository.updateActiveQuestsChannel(
            discordGuildId,
            channelId
        );

        return true;
    }

    function getGuild(discordGuildId) {
        validateDiscordId(discordGuildId);

        return guildRepository.findByDiscordId(discordGuildId);
    }

    return {
        setActiveQuestsChannel,
        getGuild
    };
}