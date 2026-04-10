import { getAllPlayers } from '@src/services/players.service';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { setMatchSession } from '@src/state/teams';
import { getSort } from '@src/store/sortHistory';
import PlayerInfo from '@src/types/playersInfo';
import Command, { type CommandMessage } from '../main/Command';

export default class ReplaySortCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const index = parseInt(this.command.split(' ')[1]) - 1;
    if (isNaN(index) || index < 0) {
      this.chatChannel.channel.send('Replay format: `!replay <número>`');
      return;
    }

    const sort = getSort(index);
    if (!sort) {
      this.chatChannel.channel.send(`Sort #${index + 1} not found`);
      return;
    }

    const players = await getAllPlayers();

    setMatchSession({
      sessionId: sort.sessionId,
      createdAt: sort.timestamp,
      teams: sort.teams.map((team) => ({
        ...team,
        players: [...team.players],
      })),
    });

    const embed = EmbedFactory.match({
      title: t('commands.replay.title', { index: index + 1 }),
      footerText: t('commands.replay.footer'),
      description: t('commands.sort.summary', {
        teamCount: sort.teams.length,
        playerCount: sort.teams.reduce(
          (total, team) => total + team.players.length,
          0
        ),
      }),
      teams: sort.teams.map((team) => ({
        name: t('commands.sort.teamField', {
          teamName: team.teamName,
          score: Number(team.score).toFixed(1).padStart(4, '0'),
        }),
        score: Number(team.score).toFixed(1).padStart(4, '0'),
        players: this.formatTeam(team.players, players),
      })),
    });

    this.chatChannel.channel.send({ embeds: [embed] });
  }

  private formatTeam(
    teamUsernames: string[],
    players: Record<string, PlayerInfo>
  ) {
    return teamUsernames
      .map((username) => {
        const info = players[username];
        return info
          ? `• ${info.dotaName} (R${info.rank})`
          : `• ${username} (${t('common.unknownPlayer')})`;
      })
      .join('\n');
  }
}
