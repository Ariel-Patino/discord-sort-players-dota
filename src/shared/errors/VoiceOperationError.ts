export class VoiceOperationError extends Error {
  readonly nextStep?: string;

  constructor(message: string, nextStep?: string) {
    super(message);
    this.name = 'VoiceOperationError';
    this.nextStep = nextStep;
  }
}
