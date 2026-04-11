import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY } from '@src/domain/models/Player';
import { t } from '@src/localization';
import {
  formatAttributeLabel,
  formatAttributeStatus,
} from '@src/presentation/discord/AttributeFormatter';
import EmbedFactory from '@src/presentation/discord/embeds';
import {
  buildSetAttributeComponents,
  buildSetAttributePrompt,
} from '@src/components/setattribute-ui';
import { getAllPlayers } from '@src/services/players.service';
import {
  deleteSetAttributeSession,
  getSetAttributeSession,
  isSetAttributeSessionExpired,
  updateSetAttributeSession,
  type SetAttributeSession,
} from '@src/state/setAttributeSessions';
import { ValidationError } from '@src/shared/errors';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import UpdatePlayerAttributesUseCase from '@src/application/use-cases/UpdatePlayerAttributesUseCase';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();
const updatePlayerAttributesUseCase = new UpdatePlayerAttributesUseCase(
  playerRepository
);

async function buildAttributeEditorResponse(
  session: SetAttributeSession,
  disableAll = false
) {
  const playerMap = await getAllPlayers();

  return {
    embeds: [
      EmbedFactory.info(
        'Attribute configuration',
        buildSetAttributePrompt(session, playerMap)
      ),
    ],
    components: buildSetAttributeComponents(session, playerMap, disableAll),
  };
}

export async function onBulkSetAttribute(
  interaction:
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const sessionId = parts[2];

  if (!sessionId) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, 'Attribute interaction failed.')],
      ephemeral: true,
    });
    return;
  }

  const session = getSetAttributeSession(sessionId);

  if (session && interaction.user.id !== session.ownerId) {
    await interaction.reply({
      embeds: [
        EmbedFactory.warning(
          'Attribute configuration',
          t('errors.unauthorizedInteraction')
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (!session || isSetAttributeSessionExpired(session)) {
    deleteSetAttributeSession(sessionId);
    await interaction.reply({
      embeds: [
        EmbedFactory.warning(
          'Attribute configuration',
          'This attribute selection has expired. Run `!setattribute` again.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (action === 'players' && interaction.isStringSelectMenu()) {
    const updatedSession = updateSetAttributeSession(sessionId, {
      selectedPlayerIds: interaction.values,
      lastAction: null,
    });

    if (!updatedSession) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, 'Attribute interaction failed.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.update(await buildAttributeEditorResponse(updatedSession));
    return;
  }

  if (action === 'toggle' && interaction.isButton()) {
    const attributeName = parts[3];

    if (!attributeName) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, 'Attribute interaction failed.')],
        ephemeral: true,
      });
      return;
    }

    if (session.selectedPlayerIds.length === 0) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            'Attribute configuration',
            'Select at least one player before toggling an attribute.'
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const playerMap = await getAllPlayers();
    const selectedPlayers = session.selectedPlayerIds
      .map((playerId) => playerMap[playerId])
      .filter(Boolean);
    const allActive =
      selectedPlayers.length > 0 &&
      selectedPlayers.every((player) => {
        const attribute = player.attributes[attributeName];
        return Boolean(attribute?.isActive) && Number(attribute?.proficiency ?? 0) > 0;
      });

    if (allActive) {
      await Promise.all(
        session.selectedPlayerIds.map(async (playerId) => {
          await updatePlayerAttributesUseCase.execute({
            playerId,
            attributeName,
            proficiencyInput: 0,
          });
        })
      );

      const updatedSession = updateSetAttributeSession(sessionId, {
        lastAction: `Deactivated ${formatAttributeLabel(attributeName)} for ${session.selectedPlayerIds.length} player(s).`,
      });

      if (!updatedSession) {
        await interaction.reply({
          embeds: [EmbedFactory.error(undefined, 'Attribute interaction failed.')],
          ephemeral: true,
        });
        return;
      }

      await interaction.update(await buildAttributeEditorResponse(updatedSession));
      await interaction.followUp({
        embeds: [
          EmbedFactory.success(
            '✅ Attribute updated',
            `${formatAttributeStatus(attributeName, {
              isActive: false,
              proficiency: 0,
            })}\n**Players:** ${session.selectedPlayerIds.length}`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const suggestedProficiency = Math.max(
      1,
      Number(
        selectedPlayers[0]?.attributes[attributeName]?.proficiency ??
          DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY
      )
    );

    const modal = new ModalBuilder()
      .setCustomId(`setattribute:proficiency-modal:${session.id}:${attributeName}`)
      .setTitle(`Set ${formatAttributeLabel(attributeName)} proficiency`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('attribute_proficiency')
            .setLabel('Proficiency (0-100)')
            .setPlaceholder('50')
            .setValue(String(suggestedProficiency))
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
    return;
  }

  if (action === 'proficiency-modal' && interaction.isModalSubmit()) {
    const attributeName = parts[3];

    if (!attributeName) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, 'Attribute interaction failed.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const normalizedProficiency = updatePlayerAttributesUseCase.parseProficiency(
        interaction.fields.getTextInputValue('attribute_proficiency')
      );

      await Promise.all(
        session.selectedPlayerIds.map(async (playerId) => {
          await updatePlayerAttributesUseCase.execute({
            playerId,
            attributeName,
            proficiencyInput: normalizedProficiency,
          });
        })
      );

      const updatedSession = updateSetAttributeSession(sessionId, {
        lastAction: `Set ${formatAttributeLabel(attributeName)} to ${normalizedProficiency}% for ${session.selectedPlayerIds.length} player(s).`,
      });

      if (updatedSession && interaction.message) {
        await interaction.message.edit(
          await buildAttributeEditorResponse(updatedSession)
        );
      }

      await interaction.reply({
        embeds: [
          EmbedFactory.success(
            '✅ Attribute updated',
            `${formatAttributeStatus(attributeName, {
              isActive: normalizedProficiency > 0,
              proficiency: normalizedProficiency,
            })}\n**Players:** ${session.selectedPlayerIds.length}`
          ),
        ],
        ephemeral: true,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        await interaction.reply({
          embeds: [
            EmbedFactory.warning('Attribute configuration', error.message),
          ],
          ephemeral: true,
        });
        return;
      }

      throw error;
    }
  }

  if (action === 'close' && interaction.isButton()) {
    deleteSetAttributeSession(sessionId);

    try {
      await interaction.message.delete();
    } catch {
      await interaction.update({
        embeds: [
          EmbedFactory.info(
            'Attribute configuration',
            'Session Closed'
          ),
        ],
        components: [],
      });
    }
    return;
  }

  if (action === 'add' && interaction.isButton()) {
    if (session.selectedPlayerIds.length === 0) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            'Attribute configuration',
            'Select at least one player before adding a new attribute.'
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`setattribute:add-modal:${session.id}`)
      .setTitle('Add attribute')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('attribute_name')
            .setLabel('Attribute name')
            .setPlaceholder('roamer')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('attribute_proficiency')
            .setLabel('Proficiency (0-100)')
            .setPlaceholder('50')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
    return;
  }

  if (action === 'add-modal' && interaction.isModalSubmit()) {
    if (session.selectedPlayerIds.length === 0) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            'Attribute configuration',
            'Select at least one player before adding a new attribute.'
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const attributeName = interaction.fields.getTextInputValue('attribute_name');
    const proficiencyInput =
      interaction.fields.getTextInputValue('attribute_proficiency').trim() ||
      String(DEFAULT_PLAYER_ATTRIBUTE_PROFICIENCY);

    try {
      const normalizedName = updatePlayerAttributesUseCase.parseAttributeName(
        attributeName
      );
      const normalizedProficiency = updatePlayerAttributesUseCase.parseProficiency(
        proficiencyInput
      );

      await Promise.all(
        session.selectedPlayerIds.map(async (playerId) => {
          await updatePlayerAttributesUseCase.execute({
            playerId,
            attributeName: normalizedName,
            proficiencyInput: normalizedProficiency,
          });
        })
      );

      const updatedSession = updateSetAttributeSession(sessionId, {
        lastAction: `Added ${formatAttributeLabel(normalizedName)} (${normalizedProficiency}%) for ${session.selectedPlayerIds.length} player(s).`,
      });

      if (updatedSession && interaction.message) {
        await interaction.message.edit(
          await buildAttributeEditorResponse(updatedSession)
        );
      }

      await interaction.reply({
        embeds: [
          EmbedFactory.success(
            '✅ Attribute added',
            `${formatAttributeStatus(normalizedName, {
              isActive: normalizedProficiency > 0,
              proficiency: normalizedProficiency,
            })}\n**Players:** ${session.selectedPlayerIds.length}`
          ),
        ],
        ephemeral: true,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        await interaction.reply({
          embeds: [EmbedFactory.warning('Attribute configuration', error.message)],
          ephemeral: true,
        });
        return;
      }

      throw error;
    }
  }
}
