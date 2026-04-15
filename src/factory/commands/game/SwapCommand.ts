import { getAllPlayers } from '@src/services/players.service';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { formatTeamPlayersFromRecord } from '@src/presentation/discord/team-player-list';
import { setMatchSession } from '@src/state/teams';
import { addSort, getAllSorts, getSort } from '@src/store/sortHistory';
import PlayerInfo from '@src/types/playersInfo';
import Command, { type CommandMessage } from '../main/Command';

export default class SwapCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const parts = this.command.trim().split(/\s+/);
    if (parts.length < 3) {
      this.chatChannel.channel.send('Swap format: `!swap <team 1 position> <team 2 position>`');
      return;
    }

    const arg1 = parts[1];
    const arg2 = parts[2];

    const isDash1 = arg1 === '-';
    const isDash2 = arg2 === '-';

    if (isDash1 && isDash2) {
      this.chatChannel.channel.send('At least one position must be a number. Example: `!swap 1 -` or `!swap - 3`.');
      return;
    }

    let pos1: number | null = null;
    let pos2: number | null = null;

    if (!isDash1) {
      pos1 = parseInt(arg1, 10);
      if (isNaN(pos1) || pos1 <= 0) {
        this.chatChannel.channel.send('Swap format: `!swap <team 1 position> <team 2 position>`');
        return;
      }
    }

    if (!isDash2) {
      pos2 = parseInt(arg2, 10);
      if (isNaN(pos2) || pos2 <= 0) {
        this.chatChannel.channel.send('Swap format: `!swap <team 1 position> <team 2 position>`');
        return;
      }
    }

    const sorts = getAllSorts();
    if (!sorts || sorts.length === 0) {
      this.chatChannel.channel.send('It\'s necessary to have at least one sort in history to perform a swap.');
      return;
    }

    const lastIndex = sorts.length - 1;
    const lastSort = getSort(lastIndex);

    if (!lastSort) {
      this.chatChannel.channel.send('Error retrieving the last sort from history.');
      return;
    }

    if (lastSort.teams.length !== 2) {
      this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.warning(
            t('commands.sort.title'),
            t('errors.swapRequiresTwoTeams')
          ),
        ],
      });
      return;
    }

    const firstTeamLabel = lastSort.teams[0]?.teamName ?? 'Team 1';
    const secondTeamLabel = lastSort.teams[1]?.teamName ?? 'Team 2';
  const team1 = [...(lastSort.teams[0]?.players ?? [])];
  const team2 = [...(lastSort.teams[1]?.players ?? [])];

    if (!isDash1 && !isDash2) {
      const index1 = (pos1 as number) - 1;
      const index2 = (pos2 as number) - 1;

      if (index1 >= team1.length || index2 >= team2.length) {
        this.chatChannel.channel.send(
          `Invalid position. ${firstTeamLabel} contains ${team1.length} players and ${secondTeamLabel} has ${team2.length}.`
        );
        return;
      }

      const player1 = team1[index1];
      const player2 = team2[index2];

      if (!player1 || !player2) {
        this.chatChannel.channel.send('No players on that positions.');
        return;
      }

      team1[index1] = player2;
      team2[index2] = player1;
    } else if (!isDash1 && isDash2) {
      const index1 = (pos1 as number) - 1;

      if (index1 >= team1.length) {
        this.chatChannel.channel.send(
          `Invalid position. ${firstTeamLabel} contains ${team1.length} players.`
        );
        return;
      }

      const moved = team1.splice(index1, 1)[0];
      if (!moved) {
        this.chatChannel.channel.send(`No player was found in that ${firstTeamLabel} position.`);
        return;
      }

      team2.push(moved);
    } else if (isDash1 && !isDash2) {
      const index2 = (pos2 as number) - 1;

      if (index2 >= team2.length) {
        this.chatChannel.channel.send(
          `Invalid position. ${secondTeamLabel} contains ${team2.length} players.`
        );
        return;
      }

      const moved = team2.splice(index2, 1)[0];
      if (!moved) {
        this.chatChannel.channel.send(`No player was found in that ${secondTeamLabel} position.`);
        return;
      }

      team1.push(moved);
    }

    const players: Record<string, PlayerInfo> = await getAllPlayers();

    const score1 = this.calculateScore(team1, players);
    const score2 = this.calculateScore(team2, players);

    const updatedTeams = lastSort.teams.map((team, index) => ({
      ...team,
      players: index === 0 ? [...team1] : [...team2],
      score: index === 0 ? score1 : score2,
    }));

    const sortId = addSort({
      sessionId: lastSort.sessionId,
      teams: updatedTeams,
      timestamp: Date.now(),
    });

    if (sortId === null) {
      this.chatChannel.channel.send('No more sorts allowed.');
      return;
    }

    const score1Formatted = score1.toFixed(1).padStart(4, '0');
    const score2Formatted = score2.toFixed(1).padStart(4, '0');

    const embed = EmbedFactory.match({
      title: `🎮 ${t('commands.sort.title')}`,
      footerText: t('commands.sort.footer', { sortId }),
      description: t('commands.sort.summary', {
        teamCount: 2,
        playerCount: team1.length + team2.length,
      }),
      teams: [
        {
          name: t('commands.sort.teamField', {
            teamName: updatedTeams[0]?.teamName ?? 'Team 1',
            score: score1Formatted,
          }),
          score: score1Formatted,
          players: formatTeamPlayersFromRecord(team1, players),
        },
        {
          name: t('commands.sort.teamField', {
            teamName: updatedTeams[1]?.teamName ?? 'Team 2',
            score: score2Formatted,
          }),
          score: score2Formatted,
          players: formatTeamPlayersFromRecord(team2, players),
        },
      ],
    });

    this.chatChannel.channel.send({ embeds: [embed] });
    setMatchSession({
      sessionId: lastSort.sessionId,
      createdAt: Date.now(),
      teams: updatedTeams.map((team) => ({
        ...team,
        players: [...team.players],
      })),
    });
  }

  private calculateScore(team: string[], players: Record<string, PlayerInfo>): number {
    if (!team.length) return 0;

    const total = team.reduce((sum, username) => {
      const info = players[username];
      if (!info || info.rank === undefined || info.rank === null) return sum;

      const rankNumber = Number(info.rank);
      if (Number.isNaN(rankNumber)) return sum;

      return sum + rankNumber;
    }, 0);

    return total;
  }

}
