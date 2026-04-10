import type { Player } from '../models/Player';

export interface PlayerRepository {
  save(player: Player): Promise<Player>;
  getById(id: string): Promise<Player | null>;
  getAll(): Promise<Player[]>;
  updateRank(id: string, rank: number): Promise<void>;
}
