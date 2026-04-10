import { Collection, GuildMember, Snowflake } from 'discord.js';
import retieveChatMembers from '@root/src/helpers/sort/retieveChatMembers';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { players } from '@root/src/store/players';
import Command, { type CommandMessage } from '../main/Command';

export default class SortCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.warning(
          t('commands.sort.title'),
          t('commands.sort.legacyDeprecated')
        ),
      ],
    });

    const members = retieveChatMembers(this.chatChannel);

    if (!members) {
      return;
    }

    this.sentTeamsPlayers(members);
  }

  sentTeamsPlayers(members: Collection<Snowflake, GuildMember>): void {
    const shuffledMembers = this.suffleTeamMembers(members);
    const team1 = shuffledMembers.slice(
      0,
      Math.ceil(shuffledMembers.length / 2)
    );
    const team2 = shuffledMembers.slice(Math.ceil(shuffledMembers.length / 2));

    this.chatChannel.channel.send(
      `Sentinel: ${team1
        .map((member) => {
          const user = players[member.user.username];
          return user ? user.dotaName : member.user.username;
        })
        .join(', ')}`
    );
    this.chatChannel.channel.send(
      `Scourge: ${team2
        .map((member) => {
          const user = players[member.user.username];
          return user ? user.dotaName : member.user.username;
        })
        .join(', ')}`
    );
  }

  suffleTeamMembers = (
    members: Collection<Snowflake, GuildMember>
  ): GuildMember[] => {
    return Array.from(members.values()).sort(() => Math.random() - 0.5);
  };
}
