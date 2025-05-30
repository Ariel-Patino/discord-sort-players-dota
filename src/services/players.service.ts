import { db } from '@src/db';
import PlayerInfo from '../types/playersInfo';
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
