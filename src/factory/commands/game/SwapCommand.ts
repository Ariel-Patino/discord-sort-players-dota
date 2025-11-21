import Command from '../main/Command';
import { EmbedBuilder } from 'discord.js';
import { getAllPlayers } from '@src/services/players.service';
import PlayerInfo from '@src/types/playersInfo';
import { getAllSorts, getSort, addSort } from '@src/store/sortHistory';
import { setTeams } from '@src/state/teams';

export default class SwapCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const parts = this.command.trim().split(/\s+/);
    if (parts.length < 3) {
      this.chatChannel.channel.send('Swap format: `!swap <sentinel position> <scourge position>`');
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
        this.chatChannel.channel.send('Swap format: `!swap <sentinel position> <scourge position>`');
        return;
      }
    }

    if (!isDash2) {
      pos2 = parseInt(arg2, 10);
      if (isNaN(pos2) || pos2 <= 0) {
        this.chatChannel.channel.send('Swap format: `!swap <sentinel position> <scourge position>`');
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

    const team1 = [...lastSort.team1];
    const team2 = [...lastSort.team2];

    if (!isDash1 && !isDash2) {
      const index1 = (pos1 as number) - 1;
      const index2 = (pos2 as number) - 1;

      if (index1 >= team1.length || index2 >= team2.length) {
        this.chatChannel.channel.send(
          `invalid position. Sentinel contains ${team1.length} players and Scourge has ${team2.length}.`
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
          `invalid position. Sentinel contains ${team1.length} players.`
        );
        return;
      }

      const moved = team1.splice(index1, 1)[0];
      if (!moved) {
        this.chatChannel.channel.send('No players on that Sentinel position.');
        return;
      }

      team2.push(moved);
    } else if (isDash1 && !isDash2) {
      const index2 = (pos2 as number) - 1;

      if (index2 >= team2.length) {
        this.chatChannel.channel.send(
          `invalid position. Scourge contains ${team2.length} players.`
        );
        return;
      }

      const moved = team2.splice(index2, 1)[0];
      if (!moved) {
        this.chatChannel.channel.send('No players on that Scourge position.');
        return;
      }

      team1.push(moved);
    }

    const players: Record<string, PlayerInfo> = await getAllPlayers();

    const score1 = this.calculateScore(team1, players);
    const score2 = this.calculateScore(team2, players);

    const sortId = addSort({
      team1,
      team2,
      score1,
      score2,
      timestamp: Date.now(),
    });

    if (sortId === null) {
      this.chatChannel.channel.send('No more sorts allowed.');
      return;
    }

    const score1Formatted = score1.toFixed(1).padStart(4, '0');
    const score2Formatted = score2.toFixed(1).padStart(4, '0');

    const embed = new EmbedBuilder()
      .setTitle('🔥 DOTITA 🔥')
      .setColor(0xff0000)
      .addFields(
        {
          name: `💀 Sentinel (Rank ${score1Formatted}) 💀`,
          value: this.formatTeam(team1, players),
        },
        {
          name: `☠️ Scourge (Rank ${score2Formatted}) ☠️`,
          value: this.formatTeam(team2, players),
        }
      )
      .setFooter({
        text: `Sort ID: #${sortId} — GO?`,
      });

    this.chatChannel.channel.send({ embeds: [embed] });
    setTeams(team1, team2);
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


  private formatTeam(teamUsernames: string[], players: Record<string, PlayerInfo>) {
    return teamUsernames
      .map((username) => {
        const info = players[username];
        return info
          ? `• ${info.dotaName} (R${info.rank})`
          : `• ${username} (UNKNOWN)`;
      })
      .join('\n');
  }
}
