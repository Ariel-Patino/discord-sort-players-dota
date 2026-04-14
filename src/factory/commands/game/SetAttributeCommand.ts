import {
  ChannelType,
  type GuildMember,
  type VoiceChannel,
} from 'discord.js';
import UpdatePlayerAttributesUseCase from '@src/application/use-cases/UpdatePlayerAttributesUseCase';
import { buildSetAttributeComponents, buildSetAttributePrompt } from '@src/components/setattribute-ui';
import { appConfig } from '@src/config/app-config';
import {
  type Player,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import EmbedFactory from '@src/presentation/discord/embeds';
import { getOrCreateAllPlayers } from '@src/services/players.service';
import { saveSetAttributeSession } from '@src/state/setAttributeSessions';
import { ValidationError } from '@src/shared/errors';
import Command, { type CommandMessage } from '../main/Command';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();
const updatePlayerAttributesUseCase = new UpdatePlayerAttributesUseCase(
  playerRepository
);

export default class SetAttributeCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const [, rawAttributeName, rawProficiencyValue] = this.command
      .trim()
      .split(/\s+/u);

    if (rawAttributeName && rawProficiencyValue !== undefined) {
      await this.executeQuickUpdate(rawAttributeName, rawProficiencyValue);
      return;
    }

    await this.openAttributeManager();
  }

  private async openAttributeManager(): Promise<void> {
    const guild = this.chatChannel.guild;
    const allVoiceMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel) => {
      if (channel.type === ChannelType.GuildVoice && channel.members.size > 0) {
        const voiceChannel = channel as VoiceChannel;
        allVoiceMembers.push(...voiceChannel.members.values());
      }
    });

    if (allVoiceMembers.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [
          EmbedFactory.warning(
            'Attribute configuration',
            'No players are currently online in any voice channel.'
          ),
        ],
      });
      return;
    }

    const playersByUsername = await getOrCreateAllPlayers(allVoiceMembers);
    const playerOptions = allVoiceMembers
      .map((member) => {
        const playerInfo = playersByUsername[member.user.username];

        return {
          label: playerInfo?.dotaName || member.displayName || member.user.username,
          value: member.user.username,
          description: `@${member.user.username} • R${Number(playerInfo?.rank ?? appConfig.rank.defaultValue)}`,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));

    const ownerUsername = this.chatChannel.author.username;
    const selectedPlayerIds = playerOptions.some(
      (player) => player.value === ownerUsername
    )
      ? [ownerUsername]
      : [];

    const session = saveSetAttributeSession({
      id: `setattribute-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      ownerId: this.chatChannel.author.id,
      guildId: guild.id,
      players: playerOptions,
      selectedPlayerIds,
      lastAction: null,
      createdAt: Date.now(),
    });

    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.info(
          'Attribute configuration',
          buildSetAttributePrompt(session, playersByUsername)
        ),
      ],
      components: buildSetAttributeComponents(session, playersByUsername),
    });
  }

  private async executeQuickUpdate(
    rawAttributeName: string,
    rawProficiencyValue: string
  ): Promise<void> {
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
        attributes: {},
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
            '✅ Attribute updated',
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
          embeds: [EmbedFactory.warning('Attribute configuration', error.message)],
        });
        return;
      }

      throw error;
    }
  }
}
