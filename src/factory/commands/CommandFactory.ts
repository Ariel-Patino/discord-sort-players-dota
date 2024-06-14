import Command from './Command';
import ListPlayersCommand from './ListPlayersCommand';
import SortCommand from './SortCommand';
import SortRankedCommand from './SortRankedCommand';

class CommandFactory {
  static createCommand(comand: string, chatChannel: any): Command {
    switch (comand) {
      case '!sort':
        return new SortCommand(comand, chatChannel);
      case '!sort-r':
        return new SortRankedCommand(comand, chatChannel);
      case '!list-p':
        return new ListPlayersCommand(comand, chatChannel);
      default:
        throw new Error('Unknown command type');
    }
  }
}

export default CommandFactory;
