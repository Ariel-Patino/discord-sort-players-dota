import type { Collection, GuildMember, Message, Snowflake } from 'discord.js';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';

const retieveChatMembers = (
  channel: Message<true>
): Collection<Snowflake, GuildMember> | null => {
  if (!channel.member?.voice.channel) {
    channel.reply({
      embeds: [EmbedFactory.warning(undefined, t('errors.voiceChannelRequired'))],
    });
    return null;
  }

  const voiceChannel = channel.member.voice.channel;
  const members = voiceChannel.members;

  if (members.size < 2) {
    channel.reply({
      embeds: [EmbedFactory.warning(undefined, t('errors.insufficientPlayers'))],
    });
    return null;
  }

  return members;
};

export default retieveChatMembers;
