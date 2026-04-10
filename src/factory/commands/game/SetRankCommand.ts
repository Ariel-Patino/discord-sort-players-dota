import {
  buildSetRankComponents,
  buildSetRankPrompt,
} from '@root/src/components/setrank-ui';
import { getOrCreateAllPlayers } from '@src/services/players.service';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { saveSetRankSession } from '@src/state/setRankSessions';
import Command, { type CommandMessage } from '../main/Command';

export default class SetRankCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;
    const connectedMembers = guild.members.cache
      .filter((member) => member.voice.channel)
      .map((member) => member);

    if (connectedMembers.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.warning(undefined, t('errors.noConnectedUsers'))],
      });
      return;
    }

    const playersByUsername = await getOrCreateAllPlayers(connectedMembers);
    const session = saveSetRankSession({
      id: `setrank-${Date.now()}-${Math.floor(Math.random() * 100_000)}`,
      ownerId: this.chatChannel.author.id,
      guildId: guild.id,
      players: connectedMembers.map((member) => {
        const playerInfo = playersByUsername[member.user.username];
        const currentRank = Number(playerInfo?.rank ?? 0).toFixed(2);

        return {
          label: member.displayName,
          value: member.user.username,
          description: `Current rank: ${currentRank}`,
        };
      }),
      selectedPlayerIds: [],
      selectedRank: null,
      playerPage: 0,
      createdAt: Date.now(),
    });

    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.info(
          t('commands.rank.selectionTitle'),
          buildSetRankPrompt(session)
        ),
      ],
      components: buildSetRankComponents(session),
    });
  }
}
