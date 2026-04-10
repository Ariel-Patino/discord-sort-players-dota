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
            '**`!sort [teams]`** – Sorts players into a configurable number of balanced teams (defaults to 2).',
            '**`!swap`** – Swap or move players between teams for two-team matches.',
            '**`!replay <n>`** – Replays sort with ID `n` (e.g. `!replay 2`).',
          ].join('\n'),
        },
        {
          name: '👥 Players & Ranks',
          value: [
            '**`!list`** – Lists all connected players.',
            '**`!listall`** – Lists all players in DB.',
            `**\`!setrank\`** – Opens a dropdown to set a player rank (${formatRankBounds()}).`,
            '**`!setrole [attribute] [0-100]`** – Updates your own role proficiency (example: `!setrole carry 85`).',
          ].join('\n'),
        },
        {
          name: '📡 Voice & Lobby',
          value: [
            '**`!move`** – Move one or more connected users to a voice channel.',
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
