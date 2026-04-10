export class ConfigurationError extends Error {
  readonly nextStep?: string;

  constructor(message: string, nextStep?: string) {
    super(message);
    this.name = 'ConfigurationError';
    this.nextStep = nextStep;
  }
}
