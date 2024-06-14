export default abstract class Command {
  constructor(
    protected command: string,
    protected chatChannel: any
  ) {}

  abstract execute(): void;
}
