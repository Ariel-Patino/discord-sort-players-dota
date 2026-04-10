export class ValidationError extends Error {
  readonly nextStep?: string;

  constructor(message: string, nextStep?: string) {
    super(message);
    this.name = 'ValidationError';
    this.nextStep = nextStep;
  }
}
