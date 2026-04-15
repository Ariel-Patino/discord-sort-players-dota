import { t } from '@src/localization';
import type { TeamRoleAssignment } from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';
import type PlayerInfo from '@src/types/playersInfo';

function formatRoleIndicators(
  playerId: string,
  roleAssignments: TeamRoleAssignment[]
): string {
  const labels = roleAssignments
    .filter((assignment) => assignment.playerId === playerId)
    .map((assignment) => resolveRoleLabel(assignment.attribute));

  return labels.length ? ` • ${labels.join(' ')}` : '';
}

function resolveRoleLabel(attribute: string): string {
  switch (attribute) {
    case 'carry':
      return '🏹 Carry';
    case 'tank':
      return '🛡️ Tank';
    case 'support':
      return '💚 Support';
    default:
      return `🎯 ${attribute}`;
  }
}

export function formatTeamPlayersFromMap(
  teamPlayerIds: string[],
  playersById: Map<string, Player>,
  roleAssignments: TeamRoleAssignment[] = []
): string {
  return teamPlayerIds
    .map((playerId, index) => {
      const player = playersById.get(playerId);
      const roleIndicators = formatRoleIndicators(playerId, roleAssignments);

      return player
        ? `${index + 1}. ${player.displayName} (R${player.rank})${roleIndicators}`
        : `${index + 1}. ${playerId} (${t('common.unknownPlayer')})${roleIndicators}`;
    })
    .join('\n');
}

export function formatTeamPlayersFromRecord(
  teamUsernames: string[],
  players: Record<string, PlayerInfo>
): string {
  return teamUsernames
    .map((username, index) => {
      const info = players[username];

      return info
        ? `${index + 1}. ${info.dotaName} (R${info.rank})`
        : `${index + 1}. ${username} (${t('common.unknownPlayer')})`;
    })
    .join('\n');
}
