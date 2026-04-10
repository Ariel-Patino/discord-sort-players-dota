import { getAllPlayers } from '@src/services/players.service';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { setTeams } from '@src/state/teams';
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

    const score1Formatted = Number(sort.score1).toFixed(1).padStart(4, '0');
    const score2Formatted = Number(sort.score2).toFixed(1).padStart(4, '0');

    setTeams(sort.team1, sort.team2);
    const embed = EmbedFactory.match({
      title: t('commands.replay.title', { index: index + 1 }),
      footerText: t('commands.replay.footer'),
      teamA: {
        score: score1Formatted,
        players: this.formatTeam(sort.team1, players),
      },
      teamB: {
        score: score2Formatted,
        players: this.formatTeam(sort.team2, players),
      },
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
