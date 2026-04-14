import type { ChatInputCommandInteraction } from 'discord.js';
import { normalizeRank } from '@src/config/app-config';
import { type Player } from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();

export async function onSetRankCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.guildOnlyInteraction'))],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('player', true);
  const rank = normalizeRank(interaction.options.getNumber('rank', true));
  const playerId = user.username;
  const existingPlayer = await playerRepository.getById(playerId);

  if (!existingPlayer) {
    const newPlayer: Player = {
      id: playerId,
      externalId: user.id,
      displayName: user.username,
      rank,
      attributes: {},
    };

    await playerRepository.save(newPlayer);
  } else {
    await playerRepository.updateRank(playerId, rank);
  }

  await interaction.editReply({
    embeds: [
      EmbedFactory.success(
        `✅ ${t('commands.rank.updatedTitle')}`,
        t('commands.rank.updatedDescription', {
          playerId,
          rank: rank.toFixed(1),
        })
      ),
    ],
  });
}
