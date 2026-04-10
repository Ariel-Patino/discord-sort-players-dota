import 'module-alias/register';
import Logger from '@src/infrastructure/logging/Logger';
import { registerProcessErrorHandlers } from '@src/infrastructure/logging/process-hooks';
import { publishSlashCommands } from './register';

registerProcessErrorHandlers({
  commandName: 'publish:slash-commands',
});

publishSlashCommands().catch((error) => {
  Logger.fromError('Failed to publish slash commands.', error, {
    commandName: 'publish:slash-commands',
    guildId: null,
    userId: null,
  });
  process.exitCode = 1;
});
