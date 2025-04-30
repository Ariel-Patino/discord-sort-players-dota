import 'module-alias/register';
import Command from './Command';
import { players } from '@root/src/store/players';
import retieveChatMembers from '@root/src/helpers/sort/retieveChatMembers';

export default class SortCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  execute(): void {
    const members = retieveChatMembers(this.chatChannel);
    if (!members) {
      return;
    }
    this.sentTeamsPlayers(members);
  }

  sentTeamsPlayers(members: any) {
    const shuffledMembers = this.suffleTeamMembers(members);
    const team1 = shuffledMembers.slice(
      0,
      Math.ceil(shuffledMembers.length / 2)
    );
    const team2 = shuffledMembers.slice(Math.ceil(shuffledMembers.length / 2));

    this.chatChannel.channel.send(
      `Sentinel: ${team1
        .map((member: any) => {
          const user = players[member?.user?.username as string];
          if (!user) {
            return member.user.username;
          }
          return user.dotaName;
        })
        .join(', ')}`
    );
    this.chatChannel.channel.send(
      `Scourge: ${team2
        .map((member: any) => {
          const user = players[member?.user?.username as string];
          if (!user) {
            return member.user.username;
          }
          return user.dotaName;
        })
        .join(', ')}`
    );
  }

  suffleTeamMembers = (members: any) => {
    return Array.from(members.values()).sort(() => Math.random() - 0.5);
  };
}
