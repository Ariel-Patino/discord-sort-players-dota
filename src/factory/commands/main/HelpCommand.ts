import { formatRankBounds } from '@src/config/app-config';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import Command, { type CommandMessage } from '../main/Command';

export default class HelpCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const embed = EmbedFactory.info(
      `📖 ${t('commands.help.title')}`,
      t('commands.help.description')
    )
      .addFields(
        {
          name: '🎲 Sorting & Swaps',
          value: [
            '**`!sort`** – Sorts players into two balanced teams using rank + randomness.',
            '**`/sort`** – Slash command version of the balanced team generator.',
            '**`!sort-old`** – Deprecated legacy alias. Use `!sort` or `/sort` instead.',
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
            `**\`!setrank\`** – Opens a dropdown to set a player rank (${formatRankBounds()}).`,
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
          value: ['**`!help`** – Shows this help message.'].join('\n'),
        }
      )
      .setFooter({ text: t('commands.help.footer') });

    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
