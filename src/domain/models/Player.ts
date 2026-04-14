export type PlayerAttributes = Record<string, number>;

export interface Player {
  id: string;
  externalId: string;
  displayName: string;
  rank: number;
  attributes: PlayerAttributes;
}

export const DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY = 50;

export function normalizeAttributeProficiency(rawValue: unknown): number {
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function normalizeSingleAttribute(rawAttribute: unknown): number {
  if (typeof rawAttribute === 'boolean') {
    return 0;
  }

  if (rawAttribute && typeof rawAttribute === 'object') {
    return 0;
  }

  return normalizeAttributeProficiency(rawAttribute);
}

export function createDefaultPlayerAttributes(
  attributeKeys: readonly string[] = [],
  defaultValue = 0
): PlayerAttributes {
  const normalizedKeys = [...new Set(attributeKeys.map(normalizeAttributeKey))].filter(
    Boolean
  );
  const normalizedValue = normalizeAttributeProficiency(defaultValue);

  return Object.fromEntries(
    normalizedKeys.map((key) => [key, normalizedValue])
  );
}

export function buildPlayerAttributes(
  rawAttributes: Partial<Record<string, unknown>> = {},
  defaultValue = DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY
): PlayerAttributes {
  const attributes = createDefaultPlayerAttributes([], defaultValue);

  for (const [rawKey, rawValue] of Object.entries(rawAttributes)) {
    const key = normalizeAttributeKey(rawKey);

    if (!key) {
      continue;
    }

    attributes[key] = normalizeSingleAttribute(rawValue);
  }

  return attributes;
}

function normalizeAttributeKey(rawKey: string): string {
  return rawKey.trim().toLowerCase();
}

export function normalizePlayerAttributes(
  rawAttributes: unknown
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

  return normalizedAttributes;
}
