import Command from '../main/Command';
import { EmbedBuilder, GuildMember, VoiceChannel } from 'discord.js';
import { getAllPlayers } from '@src/services/players.service';
import PlayerInfo from '@src/types/playersInfo';

export default class ListOnlinePlayersCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;

    const allVoiceMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel: any) => {
      if (channel.type === 2 && channel.members?.size > 0) {
        const voiceChannel = channel as VoiceChannel;
        allVoiceMembers.push(...voiceChannel.members.values());
      }
    });

    if (allVoiceMembers.length === 0) {
      this.chatChannel.channel.send(
        'No players are currently online in any voice channel.'
      );
      return;
    }

    const dbPlayers = await getAllPlayers();
    const playerMap = new Map<string, PlayerInfo>(Object.entries(dbPlayers));

    const lines = allVoiceMembers.map((m) => {
      const info = playerMap.get(m.user.username);
      return info
        ? `• ${info.dotaName} (R${info.rank})`
        : `• ${m.user.username} (UNKNOWN)`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🟢 Online Players')
      .setColor(0x00ff00)
      .setDescription(lines.join('\n'));

    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
