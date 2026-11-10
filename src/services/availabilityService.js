import {
    localDateTimeToUtc,
    formatUtcDateTime
} from '../utils/dateTime.js';

export function createAvailabilityService(availabilityRepository) {
    function addAvailability(discordGuildId, start, end, createdByDiscordId) {
        validateDiscordId(discordGuildId, 'discordGuildId');
        validateDiscordId(createdByDiscordId, 'createdByDiscordId');

        const timezone = availabilityRepository.getTimezone(discordGuildId);

        const startsAt = localDateTimeToUtc(start, timezone);
        const endsAt = localDateTimeToUtc(end, timezone);

        if (Date.parse(startsAt) >= Date.parse(endsAt)) {
            throw new Error('La date de fin doit être après le début');
        }

        const existingSlots = availabilityRepository.findActiveByGuild(discordGuildId);

        if (hasOverlap(existingSlots, startsAt, endsAt)) {
            throw new Error('Ce créneau chevauche une disponibilité existante');
        }

        const slot = availabilityRepository.create(
            discordGuildId,
            startsAt,
            endsAt,
            createdByDiscordId
        );

        return formatSlot(slot, timezone);
    }

    function editAvailability(discordGuildId, slotId, start, end) {
        validateDiscordId(discordGuildId, 'discordGuildId');
        validateSlotId(slotId);

        if (start === undefined && end === undefined) {
            throw new Error('Il manque la nouvelle horraire');
        }

        const currentSlot = availabilityRepository.findActiveById(
            discordGuildId,
            slotId
        );

        if (!currentSlot) return null;

        if (availabilityRepository.isReserved(slotId)) {
            throw new Error(
                'Il y à déjà un session réservé sur ce crenneau'
            );
        }

        const timezone = availabilityRepository.getTimezone(discordGuildId);

        const startsAt = start === undefined
            ? currentSlot.startsAt
            : localDateTimeToUtc(start, timezone);

        const endsAt = end === undefined
            ? currentSlot.endsAt
            : localDateTimeToUtc(end, timezone);

        if (Date.parse(startsAt) >= Date.parse(endsAt)) {
            throw new Error('La date de fin doit être après la date de début');
        }

        const otherSlots = availabilityRepository
            .findActiveByGuild(discordGuildId)
            .filter(slot => slot.id !== slotId);

        if (hasOverlap(otherSlots, startsAt, endsAt)) {
            throw new Error('Ce créneau chevauche une autre session');
        }

        const updatedSlot = availabilityRepository.update(
            discordGuildId,
            slotId,
            startsAt,
            endsAt
        );

        if (!updatedSlot) {
            throw new Error(`Le créneau n'a pas pu être modifié`);
        }

        return formatSlot(updatedSlot, timezone);
    }

    function removeAvailability(discordGuildId, slotId) {
        validateDiscordId(discordGuildId, 'discordGuildId');

        if (!Number.isSafeInteger(slotId) || slotId < 1) {
            throw new TypeError('slotId doit être un entier positif');
        }

        const slot = availabilityRepository.findActiveById(
            discordGuildId,
            slotId
        );

        if (!slot) return false;

        if (availabilityRepository.isReserved(slotId)) {
            throw new Error(
                'Impossible de désactiver ce créneau : il est déjà réservé par une session.'
            );
        }

        return availabilityRepository.deactivate(discordGuildId, slotId);
    }

    function listAvailability(discordGuildId) {
        validateDiscordId(discordGuildId, 'discordGuildId');

        const timezone = availabilityRepository.getTimezone(discordGuildId);
        const slots = availabilityRepository.findActiveByGuild(discordGuildId);

        return {
            timezone,
            slots: slots.map(slot => ({
                ...slot,
                startsAtFormatted: formatUtcDateTime(slot.startsAt, timezone),
                endsAtFormatted: formatUtcDateTime(slot.endsAt, timezone)
            }))
        };
    }

    function validateSlotId(slotId) {
        if (!Number.isSafeInteger(slotId) || slotId < 1) {
            throw new TypeError('slotId doit être un entier positif.');
        }
    }

    function hasOverlap(slots, startsAt, endsAt) {
        const newStart = Date.parse(startsAt);
        const newEnd = Date.parse(endsAt);

        return slots.some(slot =>
            Date.parse(slot.startsAt) < newEnd &&
            Date.parse(slot.endsAt) > newStart
        );
    }

    function formatSlot(slot, timezone) {
        return {
            ...slot,
            startsAtFormatted: formatUtcDateTime(slot.startsAt, timezone),
            endsAtFormatted: formatUtcDateTime(slot.endsAt, timezone)
        };
    }

    return {
        addAvailability,
        editAvailability,
        removeAvailability,
        listAvailability
    };
}

function validateDiscordId(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError(`${fieldName} ne doit pas etre vide`);
    }
}