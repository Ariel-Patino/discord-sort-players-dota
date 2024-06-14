import Command from './Command';

export default class ListPlayersCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  execute(): void {
    this.chatChannel.channel.send(`List Players not implemented yet`);
  }
}
