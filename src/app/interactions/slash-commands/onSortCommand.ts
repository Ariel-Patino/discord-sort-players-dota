import {
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildMember,
  type VoiceChannel,
} from 'discord.js';
import SortPlayersUseCase from '@src/application/use-cases/SortPlayersUseCase';
import { appConfig } from '@src/config/app-config';
import type { Player } from '@src/domain/models/Player';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { formatTeamPlayersFromMap } from '@src/presentation/discord/team-player-list';
import { resolveVoiceChannelTeamLabels } from '@src/presentation/discord/team-labels';
import { getOrCreateAllPlayers } from '@src/services/players.service';
import { setMatchSession } from '@src/state/teams';
import { addSort } from '@src/store/sortHistory';

const sortPlayersUseCase = new SortPlayersUseCase();

export async function onSortCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.guildOnlyInteraction'))],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild;

  if (!guild) {
    await interaction.editReply({
      embeds: [EmbedFactory.error(undefined, t('errors.guildOnlyInteraction'))],
    });
    return;
  }

  const allVoiceMembers: GuildMember[] = [];

  guild.channels.cache.forEach((channel) => {
    if (channel.type === ChannelType.GuildVoice && channel.members.size > 0) {
      const voiceChannel = channel as VoiceChannel;
      allVoiceMembers.push(...voiceChannel.members.values());
    }
  });

  if (allVoiceMembers.length === 0) {
    await interaction.editReply({
      embeds: [EmbedFactory.warning(undefined, t('errors.insufficientPlayers'))],
    });
    return;
  }

  const playersByUsername = await getOrCreateAllPlayers(allVoiceMembers);
  const sortablePlayers: Player[] = allVoiceMembers
    .map((member) => {
      const username = member.user.username;
      const playerInfo = playersByUsername[username];

      if (!playerInfo) {
        return null;
      }

      return {
        id: username,
        externalId: member.id,
        displayName: playerInfo.dotaName || member.displayName,
        rank: Number(playerInfo.rank ?? 0),
        attributes: playerInfo.attributes,
      };
    })
    .filter((player): player is Player => player !== null);

  const requestedTeamCount =
    interaction.options.getInteger('teams') ?? appConfig.sort.teams.defaultCount;
  const { minCount, maxCount } = appConfig.sort.teams;

  if (
    !Number.isInteger(requestedTeamCount) ||
    requestedTeamCount < minCount ||
    requestedTeamCount > maxCount
  ) {
    await interaction.editReply({
      embeds: [
        EmbedFactory.warning(
          t('commands.sort.title'),
          t('errors.invalidTeamCount', {
            min: minCount,
            max: maxCount,
          })
        ),
      ],
    });
    return;
  }

  if (sortablePlayers.length < requestedTeamCount) {
    await interaction.editReply({
      embeds: [
        EmbedFactory.warning(
          t('commands.sort.title'),
          t('errors.insufficientPlayersForTeamCount', {
            teamCount: requestedTeamCount,
            playerCount: sortablePlayers.length,
          })
        ),
      ],
    });
    return;
  }

  const teamNames = await resolveVoiceChannelTeamLabels(
    guild,
    requestedTeamCount
  );

  const result = sortPlayersUseCase.execute(sortablePlayers, {
    teamCount: requestedTeamCount,
    teamNames,
    noise: {
      enabled: true,
      applyChance: appConfig.sort.noise.applyChance,
      amplitude: appConfig.sort.noise.amplitude,
    },
  });

  const [primaryTeam, secondaryTeam] = result.teams;
  const playersById = new Map(sortablePlayers.map((player) => [player.id, player]));

  const sortId = addSort({
    sessionId: result.sessionId,
    teams: result.teams,
    timestamp: result.createdAt,
  });

  if (sortId === null) {
    await interaction.editReply({
      embeds: [EmbedFactory.error(undefined, t('errors.sortHistoryLimitReached'))],
    });
    return;
  }

  setMatchSession({
    sessionId: result.sessionId,
    createdAt: result.createdAt,
    teams: result.teams.map((team) => ({
      ...team,
      players: [...team.players],
    })),
  });

  const embed = EmbedFactory.match({
    title: `🎮 ${t('commands.sort.title')}`,
    footerText: t('commands.sort.footer', { sortId }),
    description: t('commands.sort.summary', {
      teamCount: result.teams.length,
      playerCount: sortablePlayers.length,
    }),
    teams: result.teams.map((team) => ({
      name: t('commands.sort.teamField', {
        teamName: team.teamName,
        score: team.score.toFixed(1).padStart(4, '0'),
      }),
      score: team.score.toFixed(1).padStart(4, '0'),
      players: formatTeamPlayersFromMap(
        team.players,
        playersById,
        team.roleAssignments
      ),
    })),
  });

  await interaction.editReply({ embeds: [embed] });
}

