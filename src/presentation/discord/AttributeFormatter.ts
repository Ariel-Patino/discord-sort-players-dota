import type { PlayerAttributes } from '@src/domain/models/Player';

const ATTRIBUTE_DISPLAY_ORDER = ['support', 'carry', 'tank'] as const;

function toAttributeLabel(name: string): string {
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
    .filter(([, attribute]) => attribute.isActive && attribute.proficiency > 0)
    .map(([name, attribute]) => {
      const label = toAttributeLabel(name);
      return `${label}: ${getAttributeStatusEmoji(attribute.proficiency)} ${attribute.proficiency}%`;
    })
    .join(' | ');
}
