import { GuildMember } from 'discord.js';
import { appConfig } from '@src/config/app-config';
import type { Player } from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import PlayerInfo from '../types/playersInfo';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();

function toPlayerInfo(player: Player): PlayerInfo {
  return {
    dotaName: player.displayName,
    rank: player.rank,
    support: false,
    tanque: false,
    carry: false,
  };
}

function toPlayerInfoMap(players: Player[]): Record<string, PlayerInfo> {
  return Object.fromEntries(
    players.map((player) => [player.id, toPlayerInfo(player)])
  );
}

export async function getOrCreateAllPlayers(
  members: GuildMember[]
): Promise<Record<string, PlayerInfo>> {
  const storedPlayers = await playerRepository.getAll();
  const playerMap = toPlayerInfoMap(storedPlayers);
  const missingPlayers = members.filter(
    (member) => !playerMap[member.user.username]
  );

  for (const member of missingPlayers) {
    const savedPlayer = await playerRepository.save({
      id: member.user.username,
      externalId: member.id,
      displayName: member.user.username,
      rank: appConfig.rank.defaultValue,
    });

    playerMap[savedPlayer.id] = toPlayerInfo(savedPlayer);
  }

  return playerMap;
}

export async function getAllPlayers(): Promise<Record<string, PlayerInfo>> {
  const storedPlayers = await playerRepository.getAll();
  return toPlayerInfoMap(storedPlayers);
}
