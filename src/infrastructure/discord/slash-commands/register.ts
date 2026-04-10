import { REST, Routes } from 'discord.js';
import { getSlashCommandPublishConfig } from '@src/config';
import Logger from '@src/infrastructure/logging/Logger';
import { slashCommandRegistry } from './registry';

export async function publishSlashCommands(): Promise<void> {
  const publishConfig = getSlashCommandPublishConfig();
  const rest = new REST({ version: '10' }).setToken(publishConfig.token);

  if (publishConfig.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(
        publishConfig.applicationId,
        publishConfig.guildId
      ),
      {
        body: slashCommandRegistry,
      }
    );

    Logger.info('Published guild slash commands.', {
      commandName: 'publish:slash-commands',
      guildId: publishConfig.guildId,
      userId: null,
      metadata: {
        applicationId: publishConfig.applicationId,
        commandCount: slashCommandRegistry.length,
        scope: 'guild',
      },
    });
    return;
  }

  await rest.put(Routes.applicationCommands(publishConfig.applicationId), {
    body: slashCommandRegistry,
  });

  Logger.info('Published global slash commands.', {
    commandName: 'publish:slash-commands',
    guildId: null,
    userId: null,
    metadata: {
      applicationId: publishConfig.applicationId,
      commandCount: slashCommandRegistry.length,
      scope: 'global',
    },
  });
}
