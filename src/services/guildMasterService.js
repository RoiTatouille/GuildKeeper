export function createGuildMasterService(guildMasterRepository) {
    return {
        addGuildMaster(discordUserId) {
            return guildMasterRepository.add(discordUserId);
        },

        removeGuildMaster(discordUserId) {
            return guildMasterRepository.remove(discordUserId);
        },

        isGuildMaster(discordUserId) {
            return guildMasterRepository.isGuildMaster(discordUserId);
        },

        getAllGuildMasters() {
            return guildMasterRepository.findAll();
        }
    };
}