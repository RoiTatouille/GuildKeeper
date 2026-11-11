import { ChannelType, EmbedBuilder } from 'discord.js';

let client;

export function setDiscordClient(discordClient) {
    client = discordClient;
}

function buildQuestEmbed(quest) {
    return new EmbedBuilder()
        .setDescription(quest.description)
        .addFields(
            ...(quest.requirements
                ? [{ name: 'Prérequis', value: quest.requirements }]
                : []),
            { name: 'Niveau minimum', value: String(quest.minLevel), inline: true },
            { name: 'Joueurs maximum', value: String(quest.maxPlayers), inline: true },
            { name: 'Récompense', value: `${quest.xpReward} XP`, inline: true }
        );
}

export async function publishQuest(discordGuildId, channelId, quest) {
    if (!client) {
        throw new Error('Le client Discord n’est pas initialisé');
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error('Le salon configuré n’est pas un forum');
    }

    const availableTag = channel.availableTags.find(
        tag => tag.name === 'Disponible'
    );

    if (!availableTag) {
        throw new Error('Le tag Disponible est absent du forum');
    }

    const embed = buildQuestEmbed(quest);

    const thread = await channel.threads.create({
        name: quest.title,
        message: {
            embeds: [embed]
        },
        appliedTags: [availableTag.id]
    });

    return thread.id;
}

export async function updateQuestPost(discordGuildId, channelId, threadId, quest) {
    if (!client) {
        throw new Error('Le client Discord n’est pas initialisé');
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== ChannelType.GuildForum ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(`Le salon configuré n’est pas un forum`);
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    await thread.setName(quest.title);

    const starterMessage = await thread.fetchStarterMessage();

    if (!starterMessage) {
        throw new Error('Le message initial de cette quête est introuvable');
    }

    await starterMessage.edit({
        embeds: [buildQuestEmbed(quest)]
    });
}

export async function deleteQuestPost(channelId, threadId) {
    const channel = await client.channels.fetch(channelId);
    const thread = await channel.threads.fetch(threadId);

    if (thread) {
        await thread.delete();
    }
}