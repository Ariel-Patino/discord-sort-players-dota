import { appConfig } from '@src/config/app-config';
import {
  createTeamAssignments,
  type TeamAssignment,
} from '@src/state/teams';

interface LegacySortRecord {
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  timestamp: number;
  sessionId?: string;
}

export interface SortRecord {
  sessionId: string;
  teams: TeamAssignment[];
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  timestamp: number;
}

type StoredSortRecord = LegacySortRecord | SortRecord;

const MAX_SORTS = appConfig.sort.history.maxEntries;
let sortHistory: StoredSortRecord[] = [];

function hasDynamicTeams(record: StoredSortRecord): record is SortRecord {
  return Array.isArray((record as SortRecord).teams);
}

function normalizeSortRecord(record: StoredSortRecord): SortRecord {
  if (hasDynamicTeams(record)) {
    const [teamA, teamB] = record.teams;

    return {
      sessionId: record.sessionId ?? `match-${record.timestamp}`,
      teams: record.teams.map((team) => ({
        ...team,
        players: [...team.players],
        roleAssignments: team.roleAssignments?.map((assignment) => ({
          ...assignment,
        })),
      })),
      team1: record.team1 ?? [...(teamA?.players ?? [])],
      team2: record.team2 ?? [...(teamB?.players ?? [])],
      score1: record.score1 ?? teamA?.score ?? 0,
      score2: record.score2 ?? teamB?.score ?? 0,
      timestamp: record.timestamp,
    };
  }

  return {
    sessionId: record.sessionId ?? `match-${record.timestamp}`,
    teams: createTeamAssignments(record.team1, record.team2, [
      record.score1,
      record.score2,
    ]),
    team1: [...record.team1],
    team2: [...record.team2],
    score1: record.score1,
    score2: record.score2,
    timestamp: record.timestamp,
  };
}

export function addSort(result: StoredSortRecord): number | null {
  if (sortHistory.length >= MAX_SORTS) {
    return null;
  }

  sortHistory.push(normalizeSortRecord(result));
  return sortHistory.length;
}

export function getSort(index: number): SortRecord | undefined {
  const record = sortHistory[index];
  return record ? normalizeSortRecord(record) : undefined;
}

export function getAllSorts(): SortRecord[] {
  return sortHistory.map((record) => normalizeSortRecord(record));
}

export function clearSortHistory(): void {
  sortHistory = [];
}
