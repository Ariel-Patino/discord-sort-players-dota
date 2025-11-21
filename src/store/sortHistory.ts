import { GuildMember } from 'discord.js';

interface SortRecord {
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  timestamp: number;
}

const MAX_SORTS = 35;
let sortHistory: SortRecord[] = [];

export function addSort(result: SortRecord): number | null {
  if (sortHistory.length >= MAX_SORTS) {
    return null;
  }

  sortHistory.push(result);
  return sortHistory.length;
}

export function getSort(index: number): SortRecord | undefined {
  return sortHistory[index];
}

export function getAllSorts(): SortRecord[] {
  return sortHistory;
}

export function clearSortHistory(): void {
  sortHistory = [];
}
