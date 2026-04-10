export interface PlayerAttribute {
  isActive: boolean;
  proficiency: number;
}

export type PlayerAttributes = Record<string, PlayerAttribute>;

export interface Player {
  id: string;
  externalId: string;
  displayName: string;
  rank: number;
  attributes: PlayerAttributes;
}

export const DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY = 50;
export const CORE_PLAYER_ATTRIBUTE_KEYS = ['support', 'tank', 'carry'] as const;

export type CorePlayerAttributeKey =
  (typeof CORE_PLAYER_ATTRIBUTE_KEYS)[number];

export function normalizeAttributeProficiency(rawValue: unknown): number {
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function normalizeSingleAttribute(rawAttribute: unknown): PlayerAttribute {
  if (typeof rawAttribute === 'boolean') {
    return {
      isActive: rawAttribute,
      proficiency: DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY,
    };
  }

  if (!rawAttribute || typeof rawAttribute !== 'object' || Array.isArray(rawAttribute)) {
    return {
      isActive: false,
      proficiency: DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY,
    };
  }

  const { isActive, proficiency } = rawAttribute as {
    isActive?: unknown;
    proficiency?: unknown;
  };

  return {
    isActive: Boolean(isActive),
    proficiency: normalizeAttributeProficiency(proficiency),
  };
}

export function createDefaultPlayerAttributes(
  defaultProficiency = DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY
): PlayerAttributes {
  const normalizedProficiency = normalizeAttributeProficiency(defaultProficiency);

  return Object.fromEntries(
    CORE_PLAYER_ATTRIBUTE_KEYS.map((key) => [
      key,
      {
        isActive: false,
        proficiency: normalizedProficiency,
      },
    ])
  );
}

export function buildPlayerAttributes(
  activeFlags: Partial<Record<CorePlayerAttributeKey, boolean>> = {},
  defaultProficiency = DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY
): PlayerAttributes {
  const attributes = createDefaultPlayerAttributes(defaultProficiency);

  for (const key of CORE_PLAYER_ATTRIBUTE_KEYS) {
    attributes[key] = {
      ...attributes[key],
      isActive: Boolean(activeFlags[key]),
    };
  }

  return attributes;
}

function normalizeAttributeKey(rawKey: string): string {
  return rawKey.trim().toLowerCase();
}

export function normalizePlayerAttributes(
  rawAttributes: unknown,
  legacyFlags: Partial<Record<string, boolean | number | null | undefined>> = {}
): PlayerAttributes {
  const normalizedAttributes = createDefaultPlayerAttributes();

  if (rawAttributes && typeof rawAttributes === 'object' && !Array.isArray(rawAttributes)) {
    for (const [rawKey, rawValue] of Object.entries(
      rawAttributes as Record<string, unknown>
    )) {
      const normalizedKey = normalizeAttributeKey(rawKey);
      normalizedAttributes[normalizedKey] = normalizeSingleAttribute(rawValue);
    }
  }

  for (const [legacyKey, rawFlag] of Object.entries(legacyFlags)) {
    if (rawFlag === undefined || rawFlag === null) {
      continue;
    }

    const targetKey = normalizeAttributeKey(legacyKey);
    const existingAttribute = normalizedAttributes[targetKey];
    normalizedAttributes[targetKey] = {
      isActive: Boolean(rawFlag),
      proficiency:
        existingAttribute?.proficiency ?? DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY,
    };
  }

  return normalizedAttributes;
}
