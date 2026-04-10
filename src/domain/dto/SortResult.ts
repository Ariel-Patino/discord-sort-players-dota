export interface SortResultTeam {
  teamId: string;
  teamName: string;
  players: string[];
  score: number;
}

export interface SortResult {
  sessionId: string;
  createdAt: number;
  teams: SortResultTeam[];
}
