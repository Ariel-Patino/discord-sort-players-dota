import Command from './Command';
import { players } from '@root/src/store/players';
import { sort } from '@root/textSource.json';
import { EmbedBuilder, GuildMember, VoiceChannel } from 'discord.js';

export default class SortRankedCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;

    const allVoiceMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel: any) => {
      if (
        channel.type === 2 &&
        (channel as VoiceChannel).members?.size > 0
      ) {
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

    const sorted = shuffled.sort((a, b) => {
      const rankA = players[a.user.username]?.rank ?? 0;
      const rankB = players[b.user.username]?.rank ?? 0;
      return rankB - rankA;
    });

    const team1: GuildMember[] = [];
    const team2: GuildMember[] = [];
    let score1 = 0;
    let score2 = 0;

    for (const member of sorted) {
      const rank = players[member.user.username]?.rank ?? 0;
      if (score1 <= score2) {
        team1.push(member);
        score1 += rank;
      } else {
        team2.push(member);
        score2 += rank;
      }
    }

    for (const member of unknown) {
      (team1.length <= team2.length ? team1 : team2).push(member);
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 DOTITA 🔥')
      .setColor(0xff0000)
      .addFields(
        {
          name: `💀 Sentinel (Rank ${score1})`,
          value: this.formatTeam(team1),
        },
        {
          name: `☠️ Scourge (Rank ${score2})`,
          value: this.formatTeam(team2),
        }
      )
      .setFooter({ text: 'GO?' });

    this.chatChannel.channel.send({ embeds: [embed] });
  }

  private formatTeam(team: GuildMember[]) {
    return team
      .map((m) => {
        const info = players[m.user.username];
        return info
          ? `• ${info.dotaName} (R${info.rank})`
          : `• ${m.user.username} (UNKNOWN)`;
      })
      .join('\n');
  }
}