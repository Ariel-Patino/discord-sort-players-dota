import type { Message } from 'discord.js';

export type CommandMessage = Message<true>;

export default abstract class Command {
  protected command: string;
  protected chatChannel: CommandMessage;

  constructor(command: string, chatChannel: CommandMessage) {
    this.command = command;
    this.chatChannel = chatChannel;
  }

  abstract execute(): Promise<void>;
}
