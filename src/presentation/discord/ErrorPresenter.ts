import type { APIEmbed } from 'discord.js';
import Logger, { type LogContext } from '@src/infrastructure/logging/Logger';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import {
  ConfigurationError,
  NotFoundError,
  ValidationError,
  VoiceOperationError,
} from '@src/shared/errors';

export default class ErrorPresenter {
  static present(error: unknown): APIEmbed {
    if (error instanceof ValidationError) {
      return EmbedFactory.warning(
        error.message,
        this.withNextStep(error.nextStep)
      ).toJSON();
    }

    if (error instanceof ConfigurationError) {
      return EmbedFactory.error(
        error.message,
        this.withNextStep(
          error.nextStep ?? 'Check the bot configuration and try again.'
        )
      ).toJSON();
    }

    if (error instanceof NotFoundError) {
      return EmbedFactory.info(
        error.message,
        this.withNextStep(error.nextStep)
      ).toJSON();
    }

    if (error instanceof VoiceOperationError) {
      return EmbedFactory.error(
        error.message,
        this.withNextStep(
          error.nextStep ?? 'Confirm the members are connected and that the bot can move them.'
        )
      ).toJSON();
    }

    return EmbedFactory.error(
      t('common.embed.errorTitle'),
      this.withNextStep(
        'Please try again in a moment. If the issue continues, review the bot logs for details.'
      )
    ).toJSON();
  }

  static log(
    context: string,
    error: unknown,
    logContext: LogContext = {}
  ): void {
    if (error instanceof ConfigurationError) {
      Logger.warn('Configuration issue handled by the Discord layer.', {
        ...logContext,
        errorType: error.name,
        metadata: {
          source: context,
          errorMessage: error.message,
          nextStep: error.nextStep,
        },
      });
      return;
    }

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      Logger.info('Handled application error.', {
        ...logContext,
        errorType: error.name,
        metadata: {
          source: context,
          errorMessage: error.message,
          nextStep: error.nextStep,
        },
      });
      return;
    }

    if (error instanceof VoiceOperationError) {
      Logger.fromError('Voice operation failed.', error, {
        ...logContext,
        metadata: {
          source: context,
          errorMessage: error.message,
          nextStep: error.nextStep,
        },
      });
      return;
    }

    Logger.fromError('Unhandled application error.', error, {
      ...logContext,
      metadata: {
        source: context,
      },
    });
  }

  private static withNextStep(nextStep?: string): string {
    return nextStep
      ? `${t('errors.nextStepLabel')} ${nextStep}`
      : t('errors.genericUnknown');
  }
}
