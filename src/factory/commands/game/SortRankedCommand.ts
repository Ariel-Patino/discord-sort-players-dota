import { ChannelType, GuildMember, VoiceChannel } from 'discord.js';
import SortPlayersUseCase from '@src/application/use-cases/SortPlayersUseCase';
import { appConfig } from '@src/config/app-config';
import type { Player } from '@src/domain/models/Player';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { setMatchSession } from '@src/state/teams';
import { addSort } from '@src/store/sortHistory';
import { getOrCreateAllPlayers } from '@root/src/services/players.service';
import Command, { type CommandMessage } from '../main/Command';

export default class SortRankedCommand extends Command {
  private readonly sortPlayersUseCase = new SortPlayersUseCase();

  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;
    const allVoiceMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel) => {
      if (channel.type === ChannelType.GuildVoice && channel.members.size > 0) {
        const voiceChannel = channel as VoiceChannel;
        allVoiceMembers.push(...voiceChannel.members.values());
      }
    });

    if (allVoiceMembers.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.warning(undefined, t('errors.insufficientPlayers'))],
      });
      return;
    }

    const playersByUsername = await getOrCreateAllPlayers(allVoiceMembers);
    const sortablePlayers: Player[] = allVoiceMembers
      .map((member) => {
        const username = member.user.username;
        const playerInfo = playersByUsername[username];

        if (!playerInfo) {
          return null;
        }

        return {
          id: username,
          externalId: member.id,
          displayName: playerInfo.dotaName || member.displayName,
          rank: Number(playerInfo.rank ?? 0),
        };
      })
      .filter((player): player is Player => player !== null);

    const requestedTeamCount = this.resolveTeamCount(sortablePlayers.length);

    if (!requestedTeamCount) {
      return;
    }

    const result = this.sortPlayersUseCase.execute(sortablePlayers, {
      teamCount: requestedTeamCount,
      noise: {
        enabled: true,
        applyChance: appConfig.sort.noise.applyChance,
        amplitude: appConfig.sort.noise.amplitude,
      },
    });

    const [primaryTeam, secondaryTeam] = result.teams;
    const team1 = primaryTeam?.players ?? [];
    const team2 = secondaryTeam?.players ?? [];
    const score1 = primaryTeam?.score ?? 0;
    const score2 = secondaryTeam?.score ?? 0;
    const playersById = new Map(sortablePlayers.map((player) => [player.id, player]));

    const sortId = addSort({
      sessionId: result.sessionId,
      teams: result.teams,
      team1,
      team2,
      score1,
      score2,
      timestamp: result.createdAt,
    });

    if (sortId === null) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.error(undefined, t('errors.sortHistoryLimitReached'))],
      });
      return;
    }

    const embed = EmbedFactory.match({
      title: `🎮 ${t('commands.sort.title')}`,
      footerText: t('commands.sort.footer', { sortId }),
      description: t('commands.sort.summary', {
        teamCount: result.teams.length,
        playerCount: sortablePlayers.length,
      }),
      teams: result.teams.map((team) => ({
        name: t('commands.sort.teamField', {
          teamName: team.teamName,
          score: team.score.toFixed(1).padStart(4, '0'),
        }),
        score: team.score.toFixed(1).padStart(4, '0'),
        players: this.formatTeam(team.players, playersById),
      })),
    });

    this.chatChannel.channel.send({ embeds: [embed] });
    setMatchSession({
      sessionId: result.sessionId,
      createdAt: result.createdAt,
      teams: result.teams.map((team) => ({
        ...team,
        players: [...team.players],
      })),
    });
  }

  private resolveTeamCount(playerCount: number): number | null {
    const rawTeamCount = this.command.trim().split(/\s+/)[1];
    const {
      defaultCount,
      minCount,
      maxCount,
    } = appConfig.sort.teams;

    const requestedCount = rawTeamCount ? Number(rawTeamCount) : defaultCount;

    if (!Number.isInteger(requestedCount) || requestedCount < minCount || requestedCount > maxCount) {
      this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.warning(
            t('commands.sort.title'),
            t('errors.invalidTeamCount', {
              min: minCount,
              max: maxCount,
            })
          ),
        ],
      });
      return null;
    }

    if (playerCount < requestedCount) {
      this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.warning(
            t('commands.sort.title'),
            t('errors.insufficientPlayersForTeamCount', {
              teamCount: requestedCount,
              playerCount,
            })
          ),
        ],
      });
      return null;
    }

    return requestedCount;
  }

  private formatTeam(
    teamPlayerIds: string[],
    playersById: Map<string, Player>
  ): string {
    return teamPlayerIds
      .map((playerId) => {
        const player = playersById.get(playerId);
        return player
          ? `• ${player.displayName} (R${player.rank})`
          : `• ${playerId} (${t('common.unknownPlayer')})`;
      })
      .join('\n');
  }
}
