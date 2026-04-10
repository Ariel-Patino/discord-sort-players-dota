import 'module-alias/register';
import { Client, GatewayIntentBits } from 'discord.js';
import Logger from '@src/infrastructure/logging/Logger';
import { registerProcessErrorHandlers } from '@src/infrastructure/logging/process-hooks';
import ErrorPresenter from '@src/presentation/discord/ErrorPresenter';
import { assertRequiredConfig, config } from './config';
import { handleInteractionCreate } from './app/events/interactionCreate';
import CommandFactory from './factory/commands/main/CommandFactory';
import isValidCommandType from './utils/commands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

registerProcessErrorHandlers({
  commandName: 'process',
});

client.once('ready', () => {
  Logger.info('Discord client is ready.', {
    commandName: 'startup',
    guildId: null,
    userId: client.user?.id ?? null,
    metadata: {
      botTag: client.user?.tag ?? 'unknown',
    },
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.inGuild()) {
    return;
  }

  const [commandToken] = message.content.trim().split(' ');
  const baseCommand = commandToken.toLowerCase();

  if (isValidCommandType(baseCommand)) {
    const logContext = {
      commandName: baseCommand,
      guildId: message.guild.id,
      userId: message.author.id,
    };

    Logger.info('Executing prefix command.', {
      ...logContext,
      metadata: {
        transport: 'prefix',
      },
    });

    try {
      const currentCommand = CommandFactory.createCommand(
        message.content,
        message
      );
      await currentCommand.execute();

      Logger.info('Prefix command completed.', {
        ...logContext,
        metadata: {
          transport: 'prefix',
        },
      });
    } catch (error) {
      ErrorPresenter.log('messageCreate', error, logContext);
      await message.channel.send({
        embeds: [ErrorPresenter.present(error)],
      });
    }
  }
});

client.on('interactionCreate', handleInteractionCreate);

assertRequiredConfig();
client.login(config.token);
