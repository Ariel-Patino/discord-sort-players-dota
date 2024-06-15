import 'module-alias/register';
import * as l from '@root/textSource.json';

const retieveChatMembers = (channel: any): any => {
  if (!channel.member?.voice.channel) {
    channel.reply(l.sort.errors.errorVoiceChannel);
    return null;
  }

  const voiceChannel = channel.member.voice.channel;
  const members = voiceChannel.members;

  if (members.size < 2) {
    channel.reply(l.sort.errors.errorMinPlayers);
    return null;
  }
  return members;
};

export default retieveChatMembers;
