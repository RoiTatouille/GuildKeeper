import * as playerRepository from './repositories/playerRepository.js';
import * as characterRepository from './repositories/characterRepository.js';

import { createPlayerService } from './services/playerService.js';
import { createCharacterService } from './services/characterService.js';

export const playerService = createPlayerService(playerRepository);
export const characterService = createCharacterService(characterRepository);