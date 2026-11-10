export function createCharacterService(characterRepository) {
    /**
     * Adds a character to a player.
     */
    function addCharacter(playerId, name, level = 1) {
        validatePlayerId(playerId);

        const characterName = validateCharacterName(name);
        validateCharacterLevel(level);

        const character = characterRepository.create(
            playerId,
            characterName,
            level
        );

        if (!character) throw new Error('Player not found');

        return character;
    }

    /**
     * Updates a character's name and/or level.
     */
    function editCharacter(playerId, characterId, updates) {
        validatePlayerId(playerId);
        validateCharacterId(characterId);

        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            throw new TypeError('Updates must be an object');
        }

        const currentCharacter = getCharacterByIds(
            playerId,
            characterId
        );

        if (!currentCharacter) return null;

        const name = updates.name === undefined
            ? currentCharacter.name
            : validateCharacterName(updates.name);

        const level = updates.level === undefined
            ? currentCharacter.level
            : updates.level;

        validateCharacterLevel(level);

        return characterRepository.update(
            playerId,
            characterId,
            name,
            level
        );
    }

    /**
     * Lists all characters of a player.
     */
    function listCharacters(playerId) {
        validatePlayerId(playerId);

        return characterRepository.findAllByPlayerId(playerId);
    }

    /**
     * Deletes a character of a player.
     */
    function deleteCharacter(playerId, characterId) {
        validatePlayerId(playerId);
        validateCharacterId(characterId);

        return characterRepository.deleteById(
            playerId,
            characterId
        );
    }

    function getCharacterByIds(playerId, characterId) {
      return characterRepository.findById(
            playerId,
            characterId
        );
    }

    return {
        addCharacter,
        editCharacter,
        getCharacterByIds,
        listCharacters,
        deleteCharacter
    };
}

function validatePlayerId(playerId) {
    if (!Number.isInteger(playerId) || playerId <= 0) {
        throw new TypeError('playerId must be an integer');
    }
}

function validateCharacterId(characterId) {
    if (!Number.isInteger(characterId) || characterId <= 0) {
        throw new TypeError('characterId must be an integer');
    }
}

function validateCharacterName(name) {
    if (typeof name !== 'string') {
        throw new TypeError('Character name must be a string');
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
        throw new Error('Character name cant be empty');
    }

    if (trimmedName.length > 100) {
        throw new Error('Character name ant exceed 100 characters');
    }

    return trimmedName;
}

function validateCharacterLevel(level) {
    if (!Number.isInteger(level) || level < 1) {
        throw new Error(
            'Character level must be an integer greater than or equal to 1'
        );
    }
}