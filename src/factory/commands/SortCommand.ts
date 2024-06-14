import 'module-alias/register';
import Command from './Command';
import * as l from '@root/textSource.json';
import { players } from '@root/src/store/players';

export default class SortCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  execute(): void {
    if (this.isUserOnVoiceChannel()) {
      this.chatChannel.reply(l.sort.errors.errorVoiceChannel);
      return;
    }

    const voiceChannel = this.chatChannel.member.voice.channel;
    const members = voiceChannel.members;

    if (this.isThereLessThanTwoPlayers(members)) {
      this.chatChannel.reply(l.sort.errors.errorMinPlayers);
      return;
    }

    this.sortPlayers(members);
  }

  isUserOnVoiceChannel = (): boolean => {
    return !this.chatChannel.member?.voice.channel;
  };

  isThereLessThanTwoPlayers = (members: any): boolean => {
    return members.size < 2;
  };

  sortPlayers(members: any) {
    const shuffledMembers = Array.from(members.values()).sort(
      () => Math.random() - 0.5
    );

    const team1 = shuffledMembers.slice(
      0,
      Math.ceil(shuffledMembers.length / 2)
    );
    const team2 = shuffledMembers.slice(Math.ceil(shuffledMembers.length / 2));

    this.chatChannel.channel.send(
      `Sentinel: ${team1
        .map(
          (member: any) => players[member?.user?.username as string].dotaName
        )
        .join(', ')}`
    );
    this.chatChannel.channel.send(
      `Scourge: ${team2
        .map(
          (member: any) => players[member?.user?.username as string].dotaName
        )
        .join(', ')}`
    );
  }
}
