import { appConfig } from '@src/config/app-config';
import {
  createDefaultPlayerAttributes,
  type Player,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import EmbedFactory from '@src/presentation/discord/embeds';
import { ValidationError } from '@src/shared/errors';
import UpdatePlayerAttributesUseCase from '@src/application/use-cases/UpdatePlayerAttributesUseCase';
import Command, { type CommandMessage } from '../main/Command';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();
const updatePlayerAttributesUseCase = new UpdatePlayerAttributesUseCase(
  playerRepository
);

export default class SetRoleCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const [, rawAttributeName, rawProficiencyValue] = this.command
      .trim()
      .split(/\s+/u);

    if (!rawAttributeName || rawProficiencyValue === undefined) {
      await this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.warning(
            'Role configuration',
            'Usage: `!setrole [attribute] [0-100]`\nExample: `!setrole carry 85`'
          ),
        ],
      });
      return;
    }

    const playerId = this.chatChannel.author.username;
    const displayName =
      this.chatChannel.member?.displayName ?? this.chatChannel.author.username;
    const existingPlayer = await playerRepository.getById(playerId);

    if (!existingPlayer) {
      const newPlayer: Player = {
        id: playerId,
        externalId: this.chatChannel.author.id,
        displayName,
        rank: appConfig.rank.defaultValue,
        attributes: createDefaultPlayerAttributes(),
      };

      await playerRepository.save(newPlayer);
    }

    try {
      const update = await updatePlayerAttributesUseCase.execute({
        playerId,
        attributeName: rawAttributeName,
        proficiencyInput: rawProficiencyValue,
        displayName,
        externalId: this.chatChannel.author.id,
      });

      await this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.success(
            '✅ Role updated',
            [
              `**Player:** ${displayName}`,
              `**Attribute:** ${update.attributeName}`,
              `**Status:** ${update.isActive ? 'Active' : 'Inactive'}`,
              `**Proficiency:** ${update.proficiency}%`,
            ].join('\n')
          ),
        ],
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        await this.chatChannel.channel.send({
          embeds: [EmbedFactory.warning('Role configuration', error.message)],
        });
        return;
      }

      throw error;
    }
  }
}
