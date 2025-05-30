export default abstract class Command {
  protected command: string;
  protected chatChannel: any;

  constructor(command: string, chatChannel: any) {
    this.command = command;
    this.chatChannel = chatChannel;
  }

  abstract execute(): Promise<void>;
}
