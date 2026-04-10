export class NotFoundError extends Error {
  readonly nextStep?: string;

  constructor(message: string, nextStep?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.nextStep = nextStep;
  }
}
