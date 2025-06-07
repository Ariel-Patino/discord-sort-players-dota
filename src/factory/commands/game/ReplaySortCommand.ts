import Command from '../main/Command';
import { getAllPlayers } from '@src/services/players.service';
import { getSort } from '@src/store/sortHistory';
import PlayerInfo from '@src/types/playersInfo';
import { EmbedBuilder } from 'discord.js';
import { setTeams } from '@src/state/teams';

export default class ReplaySortCommand extends Command {
  constructor(command: string, chatChannel: any) {
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
    const embed = new EmbedBuilder()
      .setTitle(`Replaying Sort #${index + 1}`)
      .setColor(0x00ff99)
      .addFields(
        {
          name: `💀 Sentinel (Rank ${score1Formatted}) 💀`,
          value: this.formatTeam(sort.team1, players),
        },
        {
          name: `☠️ Scourge (Rank ${score2Formatted}) ☠️`,
          value: this.formatTeam(sort.team2, players),
        }
      )
      .setFooter({ text: 'Use !go to start the game.' });

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
          : `• ${username} (UNKNOWN)`;
      })
      .join('\n');
  }
}
