import { RowDataPacket } from 'mysql2';
import { config } from '@src/config';
import { db } from '@src/db';
import type { Player } from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';

interface PlayerRow extends RowDataPacket {
  id: string;
  dotaName: string;
  rank: number;
}

export default class MySqlPlayerRepository implements PlayerRepository {
  async save(player: Player): Promise<Player> {
    await db.query(
      `INSERT INTO \`${config.dbTable}\` (id, dotaName, \`rank\`, support, tanque, carry) VALUES (?, ?, ?, ?, ?, ?)`,
      [player.id, player.displayName, player.rank, false, false, false]
    );

    return player;
  }

  async getById(id: string): Promise<Player | null> {
    const [rows] = await db.query<PlayerRow[]>(
      `SELECT * FROM \`${config.dbTable}\` WHERE id = ? LIMIT 1`,
      [id]
    );

    const row = rows[0];
    return row ? this.toDomainPlayer(row) : null;
  }

  async getAll(): Promise<Player[]> {
    const [rows] = await db.query<PlayerRow[]>(`SELECT * FROM \`${config.dbTable}\``);
    return rows.map((row) => this.toDomainPlayer(row));
  }

  async updateRank(id: string, rank: number): Promise<void> {
    await db.query(`UPDATE \`${config.dbTable}\` SET \`rank\` = ? WHERE id = ?`, [
      rank,
      id,
    ]);
  }

  private toDomainPlayer(row: PlayerRow): Player {
    return {
      id: row.id,
      externalId: row.id,
      displayName: row.dotaName || row.id,
      rank: Number(row.rank ?? 0),
    };
  }
}
