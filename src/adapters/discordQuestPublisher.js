import { ChannelType } from 'discord.js';

let client;

export function setDiscordClient(discordClient) {
    client = discordClient;
}

function buildQuestContent(quest) {
    return [
        quest.description,
        quest.requirements
            ? `**Prérequis :**\n${quest.requirements}`
            : null,
        `**Niveau min :** ${quest.minLevel}`,
        `**Joueurs max :** ${quest.maxPlayers}`,
        `**Récompense :** ${quest.xpReward} XP`
    ].filter(Boolean).join('\n\n');
}

export async function publishQuest(discordGuildId, channelId, quest) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n'est pas un forum`);
    }

    const availableTag = channel.availableTags.find(
        tag => tag.name === 'Disponible'
    );

    if (!availableTag) {
        throw new Error('Le tag Disponible est absent du forum');
    }

    const thread = await channel.threads.create({
        name: `[#${quest.id}] ${quest.title}`,
        message: {
            content: buildQuestContent(quest)
        },
        appliedTags: [availableTag.id]
    });

    return thread.id;
}

export async function updateQuestPost(discordGuildId, channelId, threadId, quest) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n'est pas un forum`);
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    await thread.setName(`[#${quest.id}] ${quest.title}`);

    const starterMessage = await thread.fetchStarterMessage();

    if (!starterMessage) {
        throw new Error('Le message initial de cette quête est introuvable');
    }

    await starterMessage.edit({
        content: buildQuestContent(quest),
        embeds: []
    });
}

export async function cancelQuestPost(discordGuildId, channelId, threadId) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n'est pas un forum`);
    }

    const cancelledTag = channel.availableTags.find(
        tag => tag.name === 'Annulée'
    );

    if (!cancelledTag) {
        throw new Error('Le tag Annulée est absent');
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord est introuvable');
    }

    await thread.setAppliedTags([cancelledTag.id]);
    await thread.setArchived(true);
}

export async function deleteQuestPost(channelId, threadId) {
    const channel = await client.channels.fetch(channelId);
    const thread = await channel.threads.fetch(threadId);

    if (thread) {
        await thread.delete();
    }
}

export async function getQuestReactionUserIds(discordGuildId, channelId, threadId) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n'est pas un forum`);
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    const message = await thread.messages.fetch({
        message: thread.id,
        force: true
    });

    if (!message) {
        throw new Error('Le message initial de cette quête est introuvable');
    }

    const reaction = message.reactions.cache.find(
        reaction => reaction.emoji.name === '✅'
    );

    if (!reaction) {
        return [];
    }

    const users = await reaction.users.fetch();

    console.log('Réactions disponibles :', message.reactions.cache.map(
        reaction => ({
            emoji: reaction.emoji.name,
            count: reaction.count
        })
    ));

    //DEBUG
    console.log('Réaction récupérée :', {
        emoji: reaction.emoji.name,
        count: reaction.count,
        users: [...users.keys()],
        botId: client.user.id
    });

    console.log('Utilisateurs récupérés :', [...users.keys()]);

    return [...users.keys()].filter(userId => userId !== client.user.id);
}

export async function markQuestInProgress(discordGuildId, channelId, threadId) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n'est pas un forum`);
    }

    const inProgressTag = channel.availableTags.find(
        tag => tag.name === 'En cours'
    );

    if (!inProgressTag) {
        throw new Error('Le tag En cours est absent du forum');
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    const tags = thread.appliedTags.filter(
        tagId => tagId !== channel.availableTags.find(tag => tag.name === 'Disponible')?.id
    );

    if (!tags.includes(inProgressTag.id)) {
        tags.push(inProgressTag.id);
    }

    await thread.setAppliedTags(tags);
}