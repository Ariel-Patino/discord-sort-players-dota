export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  commandName?: string | null;
  guildId?: string | null;
  userId?: string | null;
  errorType?: string | null;
  metadata?: Record<string, unknown>;
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

const DEFAULT_COMMAND_NAME = 'system';

export default class Logger {
  static info(message: string, context: LogContext = {}): void {
    this.write('INFO', message, context);
  }

  static warn(message: string, context: LogContext = {}): void {
    this.write('WARN', message, context);
  }

  static error(message: string, context: LogContext = {}): void {
    this.write('ERROR', message, context);
  }

  static fromError(message: string, error: unknown, context: LogContext = {}): void {
    const normalizedError = this.normalizeError(error);

    this.write('ERROR', message, {
      ...context,
      errorType: context.errorType ?? normalizedError.name,
      metadata: {
        ...context.metadata,
        error: normalizedError,
      },
    });
  }

  private static write(level: LogLevel, message: string, context: LogContext): void {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message,
      commandName: context.commandName ?? DEFAULT_COMMAND_NAME,
      guildId: context.guildId ?? null,
      userId: context.userId ?? null,
      errorType: context.errorType ?? null,
      ...(context.metadata ? { metadata: context.metadata } : {}),
    };

    const payload = this.stringifyRecord(record);

    switch (level) {
      case 'ERROR':
        console.error(payload);
        return;
      case 'WARN':
        console.warn(payload);
        return;
      default:
        console.info(payload);
    }
  }

  private static normalizeError(error: unknown): SerializedError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: 'UnknownError',
      message: this.safeToString(error),
    };
  }

  private static stringifyRecord(record: Record<string, unknown>): string {
    const seen = new WeakSet<object>();

    return JSON.stringify(record, (_key, value: unknown) => {
      if (value instanceof Error) {
        return this.normalizeError(value);
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }

        seen.add(value);
      }

      return value;
    });
  }

  private static safeToString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
