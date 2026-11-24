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

    function setGeneralChannel(discordGuildId, channelId) {
        validateDiscordId(discordGuildId);
        validateDiscordId(channelId);

        guildRepository.updateGeneralChannel(
            discordGuildId,
            channelId
        );

        return true;
    }

    return {
        setActiveQuestsChannel,
        setGeneralChannel,
        getGuild
    };
}