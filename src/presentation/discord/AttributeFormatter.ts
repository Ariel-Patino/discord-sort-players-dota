import { activeMatchmakingStrategy } from '@src/config/matchmaking-strategy';
import type { PlayerAttributes } from '@src/domain/models/Player';

export function formatAttributeLabel(name: string): string {
  return (
    activeMatchmakingStrategy
      .getAttributeDefinitions()
      .find((definition) => definition.name === name)?.label ??
    name.charAt(0).toUpperCase() + name.slice(1)
  );
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
  value: number,
  hideWhenInactive = false
): string {
  const label = formatAttributeLabel(name);

  if (value <= 0) {
    return hideWhenInactive ? '' : `${label}: ❌ 0%`;
  }

  return `${label}: ${getAttributeStatusEmoji(value)} ${value}%`;
}

export function formatPlayerAttributes(attributes: PlayerAttributes): string {
  const orderedEntries = Object.entries(attributes).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return orderedEntries
    .map(([name, value]) => formatAttributeStatus(name, value, true))
    .filter(Boolean)
    .join(' | ');
}
