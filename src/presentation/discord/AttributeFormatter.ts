import type {
  PlayerAttribute,
  PlayerAttributes,
} from '@src/domain/models/Player';

const ATTRIBUTE_DISPLAY_ORDER = ['support', 'carry', 'tank'] as const;

export function formatAttributeLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getAttributeStatusEmoji(proficiency: number): string {
  if (proficiency >= 60) {
    return '✅';
  }

  if (proficiency >= 21) {
    return '⚠️';
  }

  return '❌';
}

export function formatAttributeStatus(
  name: string,
  attribute: PlayerAttribute,
  hideWhenInactive = false
): string {
  const label = formatAttributeLabel(name);

  if (!attribute.isActive || attribute.proficiency <= 0) {
    return hideWhenInactive ? '' : `${label}: ❌ 0%`;
  }

  return `${label}: ${getAttributeStatusEmoji(attribute.proficiency)} ${attribute.proficiency}%`;
}

export function formatPlayerAttributes(attributes: PlayerAttributes): string {
  const orderedEntries = [
    ...ATTRIBUTE_DISPLAY_ORDER.filter((name) => name in attributes).map(
      (name) => [name, attributes[name]] as const
    ),
    ...Object.entries(attributes).filter(
      ([name]) =>
        !ATTRIBUTE_DISPLAY_ORDER.includes(
          name as (typeof ATTRIBUTE_DISPLAY_ORDER)[number]
        )
    ),
  ];

  return orderedEntries
    .map(([name, attribute]) =>
      formatAttributeStatus(name, attribute, true)
    )
    .filter(Boolean)
    .join(' | ');
}
