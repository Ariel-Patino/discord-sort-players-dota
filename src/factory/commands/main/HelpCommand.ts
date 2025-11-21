import Command from '../main/Command';
import { EmbedBuilder } from 'discord.js';

export default class HelpCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const embed = new EmbedBuilder()
  .setTitle('📖 Available Commands')
  .setDescription(
    'Commands are grouped by category. ' +
    'Use `!help <command>` if you want more details about one in particular (optional feature).'
  )
  .addFields(
    {
      name: '🎲 Sorting & Swaps',
      value: [
        '**`!sort`** – Sorts players into two balanced teams using rank + randomness.',
        '**`!sort-old`** – Legacy sort algorithm without ranking.',
        '**`!sort-r`** – Same as `!sort`.',
        '**`!swap`** – Swap or move players between Sentinel and Scourge using the last sort.',
        '**`!replay <n>`** – Replays sort with ID `n` (e.g. `!replay 2`).',
      ].join('\n'),
    },
    {
      name: '👥 Players & Ranks',
      value: [
        '**`!list`** – Lists all connected players.',
        '**`!list-all`** – Lists all players in DB.',
        '**`!setrank`** – Opens a dropdown to set a player rank (1.0 – 10.0).',
      ].join('\n'),
    },
    {
      name: '📡 Voice & Lobby',
      value: [
        '**`!move`** – Move any connected user to a voice channel.',
        '**`!go`** – Moves sorted players into their respective channels after `!sort`.',
        '**`!lobby`** – Sends all players back to the lobby.',
      ].join('\n'),
    },
    {
      name: 'ℹ️ Other',
      value: [
        '**`!help`** – Shows this help message.',
      ].join('\n'),
    },
  )
  .setFooter({ text: 'Sort Bot v0.7 VULTURE' });


    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
