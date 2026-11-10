const DATE_TIME_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

function getFormatter(timeZone) {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
    } catch {
        throw new Error(`Fuseau horaire invalide : ${timeZone}.`);
    }
}

function getDateParts(timestamp, formatter) {
    const parts = formatter.formatToParts(new Date(timestamp));

    return Object.fromEntries(
        parts
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, Number(part.value)])
    );
}

function getTimezoneOffset(timestamp, formatter) {
    const parts = getDateParts(timestamp, formatter);

    const localTimestamp = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );

    return localTimestamp - timestamp;
}

export function localDateTimeToUtc(value, timeZone) {
    if (typeof value !== 'string') {
        throw new Error('La date doit être une chaîne de caractères');
    }

    const match = DATE_TIME_REGEX.exec(value);

    if (!match) {
        throw new Error('Format invalide. Utilise AAAA-MM-JJ HH:mm');
    }

    const [, year, month, day, hour, minute] = match.map(Number);

    const localDate = new Date(0);
    localDate.setUTCFullYear(year, month - 1, day);
    localDate.setUTCHours(hour, minute, 0, 0);

    if (
        localDate.getUTCFullYear() !== year ||
        localDate.getUTCMonth() !== month - 1 ||
        localDate.getUTCDate() !== day ||
        localDate.getUTCHours() !== hour ||
        localDate.getUTCMinutes() !== minute
    ) {
        throw new Error(`La date ou l'heure saisie est invalide`);
    }

    const formatter = getFormatter(timeZone);
    const localTimestamp = localDate.getTime();

    const offsets = new Set();

    for (let hours = -48; hours <= 48; hours += 6) {
        const timestamp = localTimestamp + hours * 60 * 60 * 1000;
        offsets.add(getTimezoneOffset(timestamp, formatter));
    }

    const possibleInstants = [];

    for (const offset of offsets) {
        const timestamp = localTimestamp - offset;
        const parts = getDateParts(timestamp, formatter);

        if (
            parts.year === year &&
            parts.month === month &&
            parts.day === day &&
            parts.hour === hour &&
            parts.minute === minute
        ) {
            possibleInstants.push(timestamp);
        }
    }

    if (possibleInstants.length === 0) {
        throw new Error(
            `Cette heure n'existe pas dans le fuseau horaire du serveur`
        );
    }

    if (possibleInstants.length > 1) {
        throw new Error(
            `Cette heure est ambigue`
        );
    }

    return new Date(possibleInstants[0]).toISOString();
}

export function formatUtcDateTime(utcValue, timeZone) {
    const timestamp = new Date(utcValue);

    if (Number.isNaN(timestamp.getTime())) {
        throw new Error('Date UTC invalide');
    }

    return new Intl.DateTimeFormat('fr-FR', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(timestamp);
}