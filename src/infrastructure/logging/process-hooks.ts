import Logger, { type LogContext } from './Logger';

let processHooksRegistered = false;

export function registerProcessErrorHandlers(
  baseContext: LogContext = {}
): void {
  if (processHooksRegistered) {
    return;
  }

  processHooksRegistered = true;

  process.on('unhandledRejection', (reason) => {
    Logger.fromError('Unhandled promise rejection.', reason, {
      commandName: baseContext.commandName ?? 'process',
      guildId: baseContext.guildId ?? null,
      userId: baseContext.userId ?? null,
      errorType: 'UnhandledRejection',
      metadata: baseContext.metadata,
    });
  });

  process.on('uncaughtException', (error) => {
    Logger.fromError('Uncaught exception.', error, {
      commandName: baseContext.commandName ?? 'process',
      guildId: baseContext.guildId ?? null,
      userId: baseContext.userId ?? null,
      errorType: error instanceof Error ? error.name : 'UncaughtException',
      metadata: baseContext.metadata,
    });

    process.exitCode = 1;
  });
}
