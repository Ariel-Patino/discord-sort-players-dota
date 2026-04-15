import { ChannelType, GuildMember, VoiceChannel } from 'discord.js';
import { t } from '@src/localization';
import { formatPlayerAttributes } from '@src/presentation/discord/AttributeFormatter';
import EmbedFactory from '@src/presentation/discord/embeds';
import { getAllPlayers } from '@src/services/players.service';
import PlayerInfo from '@src/types/playersInfo';
import Command, { type CommandMessage } from '../main/Command';

export default class ListOnlinePlayersCommand extends Command {
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
      this.chatChannel.channel.send(
        'No players are currently online in any voice channel.'
      );
      return;
    }

    const dbPlayers = await getAllPlayers();
    const playerMap = new Map<string, PlayerInfo>(Object.entries(dbPlayers));

    const lines = allVoiceMembers.map((member) => {
      const info = playerMap.get(member.user.username);

      if (!info) {
        return `• ${member.user.username} (${t('common.unknownPlayer')})`;
      }

      const attributes = formatPlayerAttributes(info.attributes);
      return attributes
        ? `• ${info.dotaName} (R${info.rank}) — ${attributes}`
        : `• ${info.dotaName} (R${info.rank})`;
    });

    const embed = EmbedFactory.info(
      `🟢 ${t('commands.list.onlineTitle')}`,
      lines.join('\n')
    );

    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
