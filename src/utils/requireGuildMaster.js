import { guildMasterService } from '../container.js';

export async function requireGuildMaster(interaction) {
    const isGuildMaster = guildMasterService.isGuildMaster(interaction.user.id);

    if (!isGuildMaster) {
        await interaction.reply({
            content: 'Tu dois être GM',
            ephemeral: true
        });

        return false;
    }

    return true;
}