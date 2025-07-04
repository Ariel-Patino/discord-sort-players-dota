import Command from '../main/Command';
import { getTeams, clearTeams } from '@src/state/teams';
import { VoiceChannel } from 'discord.js';
import { clearSortHistory } from '@src/store/sortHistory';

export default class GoCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const { sentinel, scourge } = getTeams();

    if (sentinel.length === 0 && scourge.length === 0) {
      this.chatChannel.channel.send('!sort is required for making a !go');
      return;
    }

    const guild = this.chatChannel.guild;

    const sentinelChannel = guild.channels.cache.find(
      (c: any) =>
        (c.type === 2 && c.name.toLowerCase().trim().includes('sentinel')) ||
        c.name.toLowerCase().trim().includes('radiant')
    ) as VoiceChannel;

    const scourgeChannel = guild.channels.cache.find(
      (c: any) =>
        (c.type === 2 && c.name.toLowerCase().trim().includes('scourge')) ||
        c.name.toLowerCase().trim().includes('dire')
    ) as VoiceChannel;

    if (!sentinelChannel || !scourgeChannel) {
      this.chatChannel.channel.send(
        '"Sentinel" or "Scourge" channels weren\'t found.'
      );
      return;
    }

    const move = async (usernames: string[], channel: VoiceChannel) => {
      for (const username of usernames) {
        const member = guild.members.cache.find(
          (m: any) => m.user.username === username
        );
        if (!member || !member.voice.channel) {
          console.warn(`User ${username} not found in voice or not connected.`);
          continue;
        }
        try {
          await member.voice.setChannel(channel);
        } catch (e) {
          console.error(`Error moving ${username}:`, e);
        }
      }
    };

    await move(sentinel, sentinelChannel);
    await move(scourge, scourgeChannel);

    clearTeams();
    clearSortHistory();

    this.chatChannel.channel.send('May the best win!');
  }
}
