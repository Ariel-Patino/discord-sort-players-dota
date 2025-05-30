import Command from '../main/Command';
import { EmbedBuilder } from 'discord.js';

export default class HelpCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('Available Commands')
      .setColor(0x3498db)
      .addFields(
        {
          name: '`!sort`',
          value:
            'Sorts players into two balanced teams using ranking and randomness.',
        },
        {
          name: '`!sort-old`',
          value: 'Legacy sort algorithm without ranking.',
        },
        {
          name: '`!sort-r`',
          value: 'Same as !sort.',
        },
        {
          name: '`!list`',
          value: 'Lists all players connected',
        },
        {
          name: '`!list-all`',
          value: 'Lists all players on db',
        },
        {
          name: '`!replay <n>`',
          value: 'Replays the sort with ID number `n`. Example: `!replay 2`.',
        },
        {
          name: '`!go`',
          value:
            'Moves all sorted players into their respective channels after !sort.',
        },
        {
          name: '`!lobby`',
          value: 'Regroups all players into the lobby.',
        },
        {
          name: '`!help`',
          value: 'Displays this list of commands.',
        }
      )
      .setFooter({ text: 'Sort Bot v0.7 VULTURE' });

    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
