import type { PlayerAttributes } from '@src/domain/models/Player';

export default interface PlayerInfo {
  dotaName: string;
  rank: number;
  attributes: PlayerAttributes;
}
