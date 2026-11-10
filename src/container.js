import * as playerRepository from './repositories/playerRepository.js';
import * as characterRepository from './repositories/characterRepository.js';
import * as availabilityRepository from './repositories/availabilityRepository.js';
import * as questRepository from './repositories/questRepository.js';

import { createPlayerService } from './services/playerService.js';
import { createCharacterService } from './services/characterService.js';
import { createAvailabilityService } from './services/availabilityService.js';
import { createQuestService } from './services/questService.js';

export const playerService = createPlayerService(playerRepository);
export const characterService = createCharacterService(characterRepository);
export const availabilityService = createAvailabilityService(availabilityRepository);
export const questService = createQuestService(questRepository);