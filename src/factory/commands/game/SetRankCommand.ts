import Command from '../main/Command';
import { generateSetRankComponents } from '@root/src/components/setrank-ui';

export default class SetRankCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const { components, content } = await generateSetRankComponents(
      0,
      this.chatChannel.author.id
    );
    await this.chatChannel.channel.send({ content, components });
  }
}
