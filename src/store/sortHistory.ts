import { appConfig } from '@src/config/app-config';
import { type TeamAssignment } from '@src/state/teams';

export interface SortRecord {
  sessionId: string;
  teams: TeamAssignment[];
  timestamp: number;
}

const MAX_SORTS = appConfig.sort.history.maxEntries;
let sortHistory: SortRecord[] = [];

function cloneSortRecord(record: SortRecord): SortRecord {
  return {
    sessionId: record.sessionId,
    teams: record.teams.map((team) => ({
      ...team,
      players: [...team.players],
      roleAssignments: team.roleAssignments?.map((assignment) => ({
        ...assignment,
      })),
    })),
    timestamp: record.timestamp,
  };
}

export function addSort(result: SortRecord): number | null {
  if (sortHistory.length >= MAX_SORTS) {
    return null;
  }

  sortHistory.push(cloneSortRecord(result));
  return sortHistory.length;
}

export function getSort(index: number): SortRecord | undefined {
  const record = sortHistory[index];
  return record ? cloneSortRecord(record) : undefined;
}

export function getAllSorts(): SortRecord[] {
  return sortHistory.map((record) => cloneSortRecord(record));
}

export function clearSortHistory(): void {
  sortHistory = [];
}
