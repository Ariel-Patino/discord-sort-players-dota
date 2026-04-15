import { t } from '@src/localization';
import { formatPlayerAttributes } from '@src/presentation/discord/AttributeFormatter';
import EmbedFactory from '@src/presentation/discord/embeds';
import { getAllPlayers } from '@src/services/players.service';
import Command, { type CommandMessage } from '../main/Command';

export default class ListPlayersCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const dbPlayers = await getAllPlayers();
    const playerEntries = Object.entries(dbPlayers);

    if (playerEntries.length === 0) {
      this.chatChannel.channel.send('No registered players in the database.');
      return;
    }

    const lines = playerEntries.map(([, info]) => {
      const attributes = formatPlayerAttributes(info.attributes);
      return attributes
        ? `• ${info.dotaName} (R${info.rank}) — ${attributes}`
        : `• ${info.dotaName} (R${info.rank})`;
    });

    const embed = EmbedFactory.info(
      `📃 ${t('commands.list.registeredTitle')}`,
      lines.join('\n')
    );

    this.chatChannel.channel.send({ embeds: [embed] });
  }
}
