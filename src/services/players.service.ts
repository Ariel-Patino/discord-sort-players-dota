import { db } from '@src/db';
import PlayerInfo from '../types/playersInfo';
import { GuildMember } from 'discord.js';

export async function getOrCreateAllPlayers(
  members: GuildMember[]
): Promise<Record<string, PlayerInfo>> {
  const [rows] = await db.query('SELECT * FROM players');
  const playerMap: Record<string, PlayerInfo> = {};

  for (const row of rows as any[]) {
    playerMap[row.id] = {
      dotaName: row.dotaName,
      rank: row.rank,
      support: row.support,
      tanque: row.tanque,
      carry: row.carry,
    };
  }

  const missingPlayers = members.filter((m) => !playerMap[m.user.username]);

  for (const member of missingPlayers as any[]) {
    const id = member.user.username;
    const newPlayer: PlayerInfo = {
      dotaName: id,
      rank: 1.5,
      support: false,
      tanque: false,
      carry: false,
    };

    await db.query(
      'INSERT INTO players (id, dotaName, `rank`, support, tanque, carry) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        newPlayer.dotaName,
        newPlayer.rank,
        newPlayer.support,
        newPlayer.tanque,
        newPlayer.carry,
      ]
    );

    playerMap[id] = newPlayer;
  }

  return playerMap;
}

export async function getAllPlayers(): Promise<Record<string, PlayerInfo>> {
  const [rows] = await db.query('SELECT * FROM players');

  const playerMap: Record<string, PlayerInfo> = {};
  for (const row of rows as any[]) {
    playerMap[row.id] = {
      dotaName: row.dotaName,
      rank: row.rank,
      support: row.support,
      tanque: row.tanque,
      carry: row.carry,
    };
  }

  return playerMap;
}
