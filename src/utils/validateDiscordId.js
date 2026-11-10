export function validateDiscordId(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError(`${fieldName} must be a non-empty string`);
    }
}