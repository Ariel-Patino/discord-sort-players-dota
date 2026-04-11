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
  defaultProficiency = DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY,
  attributeKeys: readonly string[] = CORE_PLAYER_ATTRIBUTE_KEYS
): PlayerAttributes {
  const normalizedProficiency = normalizeAttributeProficiency(defaultProficiency);
  const normalizedKeys = [...new Set(attributeKeys.map(normalizeAttributeKey))].filter(
    Boolean
  );

  return Object.fromEntries(
    normalizedKeys.map((key) => [
      key,
      {
        isActive: false,
        proficiency: normalizedProficiency,
      },
    ])
  );
}

export function buildPlayerAttributes(
  activeFlags: Partial<Record<string, boolean>> = {},
  defaultProficiency = DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY
): PlayerAttributes {
  const attributeKeys = [...new Set([...CORE_PLAYER_ATTRIBUTE_KEYS, ...Object.keys(activeFlags)])];
  const attributes = createDefaultPlayerAttributes(defaultProficiency, attributeKeys);

  for (const [rawKey, rawValue] of Object.entries(activeFlags)) {
    const key = normalizeAttributeKey(rawKey);

    if (!key) {
      continue;
    }

    attributes[key] = {
      ...attributes[key],
      isActive: Boolean(rawValue),
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
  const normalizedAttributes: PlayerAttributes = {};

  if (rawAttributes && typeof rawAttributes === 'object' && !Array.isArray(rawAttributes)) {
    for (const [rawKey, rawValue] of Object.entries(
      rawAttributes as Record<string, unknown>
    )) {
      const normalizedKey = normalizeAttributeKey(rawKey);

      if (!normalizedKey) {
        continue;
      }

      normalizedAttributes[normalizedKey] = normalizeSingleAttribute(rawValue);
    }
  }

  for (const [legacyKey, rawFlag] of Object.entries(legacyFlags)) {
    if (rawFlag === undefined || rawFlag === null) {
      continue;
    }

    const targetKey = normalizeAttributeKey(legacyKey);

    if (!targetKey) {
      continue;
    }

    const existingAttribute = normalizedAttributes[targetKey];
    normalizedAttributes[targetKey] = {
      isActive: Boolean(rawFlag),
      proficiency:
        existingAttribute?.proficiency ?? DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY,
    };
  }

  return normalizedAttributes;
}
