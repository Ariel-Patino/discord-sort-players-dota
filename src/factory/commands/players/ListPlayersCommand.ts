import Command from '../main/Command';
import { EmbedBuilder } from 'discord.js';
import { getAllPlayers } from '@src/services/players.service';

export default class ListPlayersCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const dbPlayers = await getAllPlayers();

    const playerEntries = Object.entries(dbPlayers);

    if (playerEntries.length === 0) {
      this.chatChannel.channel.send('No registered players in the database.');
      return;
    }

    const lines = playerEntries.map(
      ([id, info]) => `• ${info.dotaName} (R${info.rank})`
    );

    const embed = new EmbedBuilder()
      .setTitle('📃 Registered Players')
      .setColor(0x3498db)
      .setDescription(lines.join('\n'));
    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
