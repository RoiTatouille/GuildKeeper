import { ChannelType } from 'discord.js';
import { formatQuestContent } from '../utils/formatQuestContent.js';

let client;

export function setDiscordClient(discordClient) {
    client = discordClient;
}

function buildQuestContent(quest) {
    return formatQuestContent(quest);
}

async function fetchGuildChannel(discordGuildId, channelId, channelType, errorMessage) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const channel = await client.channels.fetch(channelId);

    if (
        !channel ||
        channel.type !== channelType ||
        channel.guildId !== discordGuildId
    ) {
        throw new Error(errorMessage);
    }

    return channel;
}

async function fetchQuestThread(discordGuildId, channelId, threadId) {
    const channel = await fetchGuildChannel(
        discordGuildId,
        channelId,
        ChannelType.GuildForum,
        `Le salon configuré n'est pas un forum`
    );

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    return thread;
}

async function fetchParticipantNames(discordGuildId, participants) {
    const guild = await client.guilds.fetch(discordGuildId);

    return Promise.all(
        participants.map(async participant => {
            const member = await guild.members.fetch(participant.discordUserId)
                .catch(() => null);

            return {
                ...participant,
                displayName: member?.displayName ?? participant.discordUserId
            };
        })
    );
}

export async function publishQuest(discordGuildId, channelId, quest) {
    const channel = await fetchGuildChannel(
        discordGuildId,
        channelId,
        ChannelType.GuildForum,
        `Le salon configuré n'est pas un forum`
    );

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

export async function publishSessionRecap(discordGuildId, session) {
    const thread = await fetchQuestThread(
        discordGuildId,
        session.activeQuestsChannelId,
        session.discordMessageId
    );

    const participantIds = session.participants.map(
        participant => participant.discordUserId
    );

    const content = [
        `**Mission terminée : ${session.questTitle}**`,
        `Récompense : **${session.xpAmount} XP** par aventurier`,
        `Participants : ${participantIds.map(id => `<@${id}>`).join(', ')}`
    ].join('\n\n');

    await thread.send({
        content,
        allowedMentions: {
            users: participantIds
        }
    });
}

export async function publishSessionAnnouncement(discordGuildId, session, deaths) {
    const channel = await fetchGuildChannel(
        discordGuildId,
        session.generalChannelId,
        ChannelType.GuildText,
        'Le salon général configuré est introuvable ou invalide'
    );

    const participants = await fetchParticipantNames(
        discordGuildId,
        session.participants
    );

    let content;
    let allowedMentions = { parse: [] };

    if (deaths.length === 0) {
        content = `Les aventuriers de la quête **${session.questTitle}** sont de retour parmi nous : ${participants.map(participant => participant.displayName).join(', ')}`;
    } else {
        const announcements = deaths.map(death => {
            const participant = participants.find(
                participant => participant.playerId === death.playerId
            );

            return `Le personnage **${death.characterName}**, appartenant à **${participant.displayName}**, est mort au cours de la quête **${session.questTitle}**`;
        });

        content = `@everyone\n${announcements.join('\n')}`;
        allowedMentions = { parse: ['everyone'] };
    }

    await channel.send({
        content,
        allowedMentions
    });
}

export async function updateQuestPost(discordGuildId, channelId, threadId, quest) {
    if (!client) {
        throw new Error(`Le client Discord n'est pas initialisé`);
    }

    const thread = await fetchQuestThread(
        discordGuildId,
        channelId,
        threadId
    );

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
    const channel = await fetchGuildChannel(
        discordGuildId,
        channelId,
        ChannelType.GuildForum,
        `Le salon configuré n'est pas un forum`
    );

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

    const thread = await fetchQuestThread(
        discordGuildId,
        channelId,
        threadId
    );

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

    return [...users.keys()].filter(userId => userId !== client.user.id);
}

async function updateQuestStatus(discordGuildId, channelId, threadId, {
    targetTagName,
    previousTagName,
    unarchive = false
}) {
    const channel = await fetchGuildChannel(
        discordGuildId,
        channelId,
        ChannelType.GuildForum,
        `Le salon configuré n'est pas un forum`
    );

    const targetTag = channel.availableTags.find(
        tag => tag.name === targetTagName
    );

    if (!targetTag) {
        throw new Error(`Le tag ${targetTagName} est absent du forum`);
    }

    const previousTag = channel.availableTags.find(
        tag => tag.name === previousTagName
    );

    if (!previousTag) {
        throw new Error(`Le tag ${previousTagName} est absent du forum`);
    }

    const thread = await channel.threads.fetch(threadId);

    if (!thread) {
        throw new Error('Le post Discord de cette quête est introuvable');
    }

    if (unarchive && thread.archived) {
        await thread.setArchived(false);
    }

    const tags = thread.appliedTags.filter(
        tagId => tagId !== previousTag.id
    );

    if (!tags.includes(targetTag.id)) {
        tags.push(targetTag.id);
    }

    await thread.setAppliedTags(tags);
}

export async function markQuestCompleted(discordGuildId, channelId, threadId) {
    await updateQuestStatus(discordGuildId, channelId, threadId, {
        targetTagName: 'Complète',
        previousTagName: 'En cours'
    });
}

export async function markQuestInProgress(discordGuildId, channelId, threadId) {
    await updateQuestStatus(discordGuildId, channelId, threadId, {
        targetTagName: 'En cours',
        previousTagName: 'Disponible'
    });
}

export async function markQuestAvailable(discordGuildId, channelId, threadId) {
    await updateQuestStatus(discordGuildId, channelId, threadId, {
        targetTagName: 'Disponible',
        previousTagName: 'En cours',
        unarchive: true
    });
}