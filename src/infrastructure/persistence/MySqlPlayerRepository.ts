import { RowDataPacket } from 'mysql2';
import { config } from '@src/config';
import { db } from '@src/db';
import {
  normalizePlayerAttributes,
  type Player,
  type PlayerAttributes,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import { ensurePlayerTableSchema } from './playerSchema';

interface PlayerRow extends RowDataPacket {
  id: string;
  dotaName: string | null;
  rank: number | string | null;
  attributes?: PlayerAttributes | string | null;
  [key: string]: unknown;
}

export default class MySqlPlayerRepository implements PlayerRepository {
  private static schemaReady: Promise<void> | null = null;

  async save(player: Player): Promise<Player> {
    await this.ensureSchema();
    const attributes = normalizePlayerAttributes(player.attributes);

    await db.query(
      `INSERT INTO \`${config.dbTable}\` (id, dotaName, \`rank\`, attributes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE dotaName = VALUES(dotaName), \`rank\` = VALUES(\`rank\`), attributes = VALUES(attributes)`,
      [
        player.id,
        player.displayName,
        player.rank,
        JSON.stringify(attributes),
      ]
    );

    return {
      ...player,
      attributes,
    };
  }

  async getById(id: string): Promise<Player | null> {
    await this.ensureSchema();

    const [rows] = await db.query<PlayerRow[]>(
      `SELECT * FROM \`${config.dbTable}\` WHERE id = ? LIMIT 1`,
      [id]
    );

    const row = rows[0];
    return row ? this.toDomainPlayer(row) : null;
  }

  async getAll(): Promise<Player[]> {
    await this.ensureSchema();
    const [rows] = await db.query<PlayerRow[]>(`SELECT * FROM \`${config.dbTable}\``);
    return rows.map((row) => this.toDomainPlayer(row));
  }

  async updateRank(id: string, rank: number): Promise<void> {
    await this.ensureSchema();

    await db.query(`UPDATE \`${config.dbTable}\` SET \`rank\` = ? WHERE id = ?`, [
      rank,
      id,
    ]);
  }

  private ensureSchema(): Promise<void> {
    MySqlPlayerRepository.schemaReady ??= ensurePlayerTableSchema(config.dbTable);
    return MySqlPlayerRepository.schemaReady;
  }

  private toDomainPlayer(row: PlayerRow): Player {
    const { id, dotaName, rank, attributes } = row;

    return {
      id,
      externalId: id,
      displayName: dotaName || id,
      rank: Number(rank ?? 0),
      attributes: normalizePlayerAttributes(this.parseAttributes(attributes)),
    };
  }

  private parseAttributes(rawAttributes: PlayerRow['attributes']): unknown {
    if (typeof rawAttributes !== 'string') {
      return rawAttributes;
    }

    try {
      return JSON.parse(rawAttributes) as unknown;
    } catch {
      return undefined;
    }
  }
}
