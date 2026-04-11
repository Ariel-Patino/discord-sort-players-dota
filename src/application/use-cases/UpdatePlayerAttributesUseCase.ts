import {
  normalizeAttributeProficiency,
  normalizePlayerAttributes,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import { ValidationError } from '@src/shared/errors';

export interface UpdatePlayerAttributeInput {
  playerId: string;
  attributeName: string;
  proficiencyInput: string | number;
  displayName?: string;
  externalId?: string;
}

export interface UpdatedPlayerAttribute {
  playerId: string;
  attributeName: string;
  isActive: boolean;
  proficiency: number;
  previousIsActive: boolean;
  previousProficiency: number;
}

export default class UpdatePlayerAttributesUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(
    input: UpdatePlayerAttributeInput
  ): Promise<UpdatedPlayerAttribute> {
    const playerId = input.playerId.trim();

    if (!playerId) {
      throw new ValidationError(
        'A valid player profile is required before updating an attribute.',
        'Try again after your player profile has been created.'
      );
    }

    const normalizedAttributeName = this.parseAttributeName(input.attributeName);
    const normalizedProficiency = this.parseProficiency(input.proficiencyInput);
    const existingPlayer = await this.playerRepository.getById(playerId);

    if (!existingPlayer) {
      throw new ValidationError(
        'Your player profile was not found.',
        'Join a match or run `!sort` once so the bot can register your player profile.'
      );
    }

    const currentAttributes = normalizePlayerAttributes(existingPlayer.attributes);
    const previousAttribute = currentAttributes[normalizedAttributeName] ?? {
      isActive: false,
      proficiency: 0,
    };

    const nextAttributes = {
      ...currentAttributes,
      [normalizedAttributeName]: {
        isActive: normalizedProficiency > 0,
        proficiency: normalizedProficiency,
      },
    };

    await this.playerRepository.save({
      ...existingPlayer,
      displayName: input.displayName ?? existingPlayer.displayName,
      externalId: input.externalId ?? existingPlayer.externalId,
      attributes: nextAttributes,
    });

    return {
      playerId,
      attributeName: normalizedAttributeName,
      isActive: normalizedProficiency > 0,
      proficiency: normalizedProficiency,
      previousIsActive: previousAttribute.isActive,
      previousProficiency: previousAttribute.proficiency,
    };
  }

  parseAttributeName(rawInput: string): string {
    const normalizedAttributeName = rawInput
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, '-');

    if (
      !normalizedAttributeName ||
      !/^[a-z][a-z0-9_-]{1,31}$/u.test(normalizedAttributeName)
    ) {
      throw new ValidationError(
        'Enter a valid attribute name before saving.',
        'Use a simple attribute name such as `carry`, `tank`, or `support`.'
      );
    }

    return normalizedAttributeName;
  }

  parseProficiency(rawInput: string | number): number {
    const numericValue =
      typeof rawInput === 'number'
        ? rawInput
        : Number.parseFloat(rawInput.trim().replace(',', '.'));

    if (!Number.isFinite(numericValue)) {
      throw new ValidationError(
        'Enter a numeric attribute proficiency before saving.',
        'Use a whole number between 0 and 100 (example: `!setattribute carry 85`).'
      );
    }

    if (numericValue < 0 || numericValue > 100) {
      throw new ValidationError(
        'Attribute proficiency must stay between 0 and 100.',
        'Use a value inside the allowed range and try again.'
      );
    }

    return normalizeAttributeProficiency(numericValue);
  }
}
