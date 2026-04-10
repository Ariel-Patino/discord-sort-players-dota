import { generateSetRankComponents } from '@root/src/components/setrank-ui';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import Command, { type CommandMessage } from '../main/Command';

export default class SetRankCommand extends Command {
  private readonly playerRepository: PlayerRepository;

  constructor(
    command: string,
    chatChannel: CommandMessage,
    playerRepository: PlayerRepository = new MySqlPlayerRepository()
  ) {
    super(command, chatChannel);
    this.playerRepository = playerRepository;
  }

  async execute(): Promise<void> {
    const players = await this.playerRepository.getAll();
    const { components, content } = await generateSetRankComponents(
      0,
      this.chatChannel.author.id,
      players
    );

    await this.chatChannel.channel.send({
      embeds: [EmbedFactory.info(t('commands.rank.selectionTitle'), content)],
      components,
    });
  }
}
