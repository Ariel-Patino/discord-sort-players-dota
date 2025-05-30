import { GuildMember } from 'discord.js';

let sentinelTeam: string[] = [];
let scourgeTeam: string[] = [];

export function setTeams(team1: string[], team2: string[]) {
  sentinelTeam = team1;
  scourgeTeam = team2;
}

export function getTeams(): { sentinel: string[]; scourge: string[] } {
  return { sentinel: sentinelTeam, scourge: scourgeTeam };
}

export function clearTeams() {
  sentinelTeam = [];
  scourgeTeam = [];
}
