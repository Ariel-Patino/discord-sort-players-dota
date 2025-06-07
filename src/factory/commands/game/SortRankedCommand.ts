import Command from '../main/Command';
import PlayerInfo from '@root/src/types/playersInfo';
import { getAllPlayers } from '@root/src/services/players.service';
import { sort } from '@root/textSource.json';
import { EmbedBuilder, GuildMember, VoiceChannel } from 'discord.js';
import { setTeams } from '@src/state/teams';
import { addSort } from '@src/store/sortHistory';

export default class SortRankedCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const players = await getAllPlayers();
    const guild = this.chatChannel.guild;

    const allVoiceMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel: any) => {
      if (channel.type === 2 && (channel as VoiceChannel).members?.size > 0) {
        const voiceChannel = channel as VoiceChannel;
        allVoiceMembers.push(...voiceChannel.members.values());
      }
    });

    if (allVoiceMembers.length === 0) {
      this.chatChannel.channel.send(sort.errors.errorMinPlayers);
      return;
    }

    const known = allVoiceMembers.filter((m) => players[m.user.username]);
    const unknown = allVoiceMembers.filter((m) => !players[m.user.username]);

    const shuffled = known.sort(() => Math.random() - 0.5);

    const applyNoise = Math.random() < 0.3;

    const rankedMembers = shuffled.map((member) => {
      const username = member.user.username;
      const base = Number(players[username]?.rank ?? 0);
      const noise = applyNoise ? (Math.random() - 0.5) * 0.2 : 0;
      return {
        username,
        rank: base + noise,
      };
    });

    const team1: string[] = [];
    const team2: string[] = [];
    let score1 = 0;
    let score2 = 0;
    const maxSize1 = Math.ceil(rankedMembers.length / 2);
    const maxSize2 = Math.floor(rankedMembers.length / 2);

    for (const player of rankedMembers) {
      if (
        team1.length < maxSize1 &&
        (score1 <= score2 || team2.length >= maxSize2)
      ) {
        team1.push(player.username);
        score1 += player.rank;
      } else {
        team2.push(player.username);
        score2 += player.rank;
      }
    }
    const sortId = addSort({
      team1,
      team2,
      score1,
      score2,
      timestamp: Date.now(),
    });

    if (sortId === null) {
      this.chatChannel.channel.send('Just Pick one, Fucking pussy!');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 DOTITA 🔥')
      .setColor(0xff0000)
      .addFields(
        {
          name: `💀 Sentinel (Rank ${score1.toFixed(1).padStart(4, '0')}) 💀`,
          value: this.formatTeam(team1, players),
        },
        {
          name: `☠️ Scourge (Rank ${score2.toFixed(1).padStart(4, '0')}) ☠️`,
          value: this.formatTeam(team2, players),
        }
      )
      .setFooter({ text: `Sort ID: #${sortId} — GO?` });

    this.chatChannel.channel.send({ embeds: [embed] });
    setTeams(team1, team2);
  }

  private formatTeam(team: string[], players: Record<string, PlayerInfo>) {
    return team
      .map((username) => {
        const info = players[username];
        return info
          ? `• ${info.dotaName} (R${info.rank})`
          : `• ${username} (UNKNOWN)`;
      })
      .join('\n');
  }
}
