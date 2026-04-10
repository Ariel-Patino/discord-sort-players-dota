import {
  ChannelType,
  type ButtonInteraction,
  type GuildMember,
  type StringSelectMenuInteraction,
  type VoiceChannel,
} from 'discord.js';
import {
  buildBulkMoveComponents,
  buildBulkMovePrompt,
  disableMoveRows,
} from '@src/components/move-ui';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import {
  deleteBulkMoveSession,
  getBulkMoveSession,
  isBulkMoveSessionExpired,
  updateBulkMoveSession,
} from '@src/state/bulkMoveSessions';

export async function onBulkMove(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const sessionId = parts[2];

  if (!sessionId) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
      ephemeral: true,
    });
    return;
  }

  const session = getBulkMoveSession(sessionId);

  if (session && interaction.user.id !== session.ownerId) {
    await interaction.reply({
      embeds: [
        EmbedFactory.warning(
          t('commands.move.title'),
          t('errors.moveSessionUnauthorized')
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (!session || isBulkMoveSessionExpired(session)) {
    deleteBulkMoveSession(sessionId);
    await interaction.reply({
      embeds: [EmbedFactory.warning(undefined, t('errors.moveSessionExpired'))],
      ephemeral: true,
    });
    return;
  }

  if (action === 'members' && interaction.isStringSelectMenu()) {
    const updatedSession = updateBulkMoveSession(sessionId, {
      selectedMemberIds: interaction.values,
    });

    if (!updatedSession) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      embeds: [
        EmbedFactory.info(
          t('commands.move.title'),
          buildBulkMovePrompt(updatedSession)
        ),
      ],
      components: buildBulkMoveComponents(updatedSession),
    });
    return;
  }

  if (action === 'channel' && interaction.isButton()) {
    const channelId = parts[3];

    if (!channelId) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    const updatedSession = updateBulkMoveSession(sessionId, {
      selectedChannelId: channelId,
    });

    if (!updatedSession) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      embeds: [
        EmbedFactory.info(
          t('commands.move.title'),
          buildBulkMovePrompt(updatedSession)
        ),
      ],
      components: buildBulkMoveComponents(updatedSession),
    });
    return;
  }

  if (action === 'execute' && interaction.isButton()) {
    if (
      session.selectedMemberIds.length === 0 ||
      !session.selectedChannelId
    ) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(undefined, t('errors.moveSelectionRequired')),
        ],
        ephemeral: true,
      });
      return;
    }

    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.guildOnlyInteraction'))],
        ephemeral: true,
      });
      return;
    }

    const targetChannel = guild.channels.cache.get(session.selectedChannelId);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    const moveResults = await Promise.allSettled(
      session.selectedMemberIds.map(async (memberId) => {
        const member = guild.members.cache.get(memberId);

        if (!member) {
          throw new Error(`Member ${memberId} was not found in the guild cache.`);
        }

        await member.voice.setChannel(targetChannel as VoiceChannel);
        return member;
      })
    );

    const movedMembers = moveResults.filter(
      (result): result is PromiseFulfilledResult<GuildMember> =>
        result.status === 'fulfilled'
    );
    const failedMoves = moveResults.length - movedMembers.length;

    const completionEmbed =
      failedMoves > 0
        ? EmbedFactory.warning(
            t('commands.move.title'),
            t('commands.move.partialSuccess', {
              count: movedMembers.length,
              failed: failedMoves,
              channel: targetChannel.name,
            })
          )
        : EmbedFactory.success(
            t('commands.move.title'),
            t('commands.move.bulkSuccess', {
              count: movedMembers.length,
              channel: targetChannel.name,
            })
          );

    deleteBulkMoveSession(sessionId);

    await interaction.update({
      embeds: [completionEmbed],
      components: disableMoveRows(buildBulkMoveComponents(session, true)),
    });
  }
}
