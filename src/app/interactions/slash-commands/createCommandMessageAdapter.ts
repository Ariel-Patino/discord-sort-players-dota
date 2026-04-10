import type {
  ChatInputCommandInteraction,
  GuildMember,
  MessageCreateOptions,
  MessagePayload,
} from 'discord.js';
import type { CommandMessage } from '@src/factory/commands/main/Command';

export function createCommandMessageAdapter(
  interaction: ChatInputCommandInteraction,
  commandText: string
): CommandMessage {
  if (!interaction.inGuild()) {
    throw new Error('Slash command interactions must be used inside a server.');
  }

  const channel = interaction.channel;

  if (!channel?.isTextBased()) {
    throw new Error('Slash command interactions require a text-based channel.');
  }

  const commandMessage = {
    content: commandText,
    author: interaction.user,
    member: interaction.member as GuildMember,
    guild: interaction.guild,
    channel,
    reply: async (options: string | MessagePayload | MessageCreateOptions) => {
      await channel.send(options as string | MessagePayload | MessageCreateOptions);
      return commandMessage;
    },
  };

  return commandMessage as unknown as CommandMessage;
}
