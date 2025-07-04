import Command from '../main/Command';
import { VoiceChannel, GuildMember } from 'discord.js';

export default class RegroupCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;

    const targetChannel = guild.channels.cache.find(
      (c: any) => c.type === 2 && c.name.toLowerCase().trim().includes('lobby')
    ) as VoiceChannel;

    if (!targetChannel) {
      this.chatChannel.channel.send('Lobby channel not found".');
      return;
    }

    const allMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel: any) => {
      if (channel.type === 2 && channel.id !== targetChannel.id) {
        const voiceChannel = channel as VoiceChannel;
        allMembers.push(...voiceChannel.members.values());
      }
    });

    if (allMembers.length === 0) {
      this.chatChannel.channel.send('There is nobody, mr/ms Lonely.');
      return;
    }

    for (const member of allMembers) {
      try {
        await member.voice.setChannel(targetChannel);
      } catch (err) {
        console.error(`Error moving ${member.user.username}:`, err);
      }
    }

    this.chatChannel.channel.send(
      `All people on: "${targetChannel.name}" channel.`
    );
  }
}
