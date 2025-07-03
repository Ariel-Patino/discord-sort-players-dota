import Command from '../main/Command';
import { VoiceChannel } from 'discord.js';

export default class SwapCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;

    try {
      await this.chatChannel.delete();
    } catch (e) {
      console.warn('Failed to delete command message:', e);
    }

    const sentinelChannel = guild.channels.cache.find(
      (c: any) =>
        c.type === 2 &&
        c.name.toLowerCase().trim() === '🧙-sentinel-🧙'.toLowerCase().trim()
    ) as VoiceChannel;

    const scourgeChannel = guild.channels.cache.find(
      (c: any) =>
        c.type === 2 &&
        c.name.toLowerCase().trim() === '💀-scourge-💀'.toLowerCase().trim()
    ) as VoiceChannel;

    if (!sentinelChannel || !scourgeChannel) return;

    const sentinelMembers = Array.from(sentinelChannel.members.values());
    const scourgeMembers = Array.from(scourgeChannel.members.values());

    for (const member of sentinelMembers) {
      try {
        await member.voice.setChannel(scourgeChannel);
      } catch (e) {
        console.error(`Failed to move ${member.user.username}:`, e);
      }
    }

    for (const member of scourgeMembers) {
      try {
        await member.voice.setChannel(sentinelChannel);
      } catch (e) {
        console.error(`Failed to move ${member.user.username}:`, e);
      }
    }
  }
}
