export function formatQuestContent(quest) {
    return [
        quest.description,
        quest.requirements
            ? `**Prérequis :**\n${quest.requirements}`
            : null,
        `**Niveau minimum :** ${quest.minLevel}`,
        `**Joueurs :** ${quest.minPlayers} - ${quest.maxPlayers}`,
        `**Récompense :** ${quest.xpReward} XP`
    ].filter(Boolean).join('\n\n');
}