import Command from './Command';

export default class SortRankedCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  execute(): void {
    this.chatChannel.channel.send(`Sort Ranked not implemented yet`);
  }
}
