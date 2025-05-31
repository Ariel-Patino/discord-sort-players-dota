import Command from './Command';
import ListPlayersCommand from '../players/ListPlayersCommand';
import ListOnlinePlayersCommand from '../players/ListOnlinePlayersCommand';
import SortCommand from '../game/SortCommand';
import ReplaySortCommand from '../game/ReplaySortCommand';
import SortRankedCommand from '../game/SortRankedCommand';
import RegroupCommand from '../game/RegroupCommand';
import GoCommand from '../game/GoCommand';
import HelpCommand from './HelpCommand';
import SwapCommand from './SwapTeamsCommand';

class CommandFactory {
  static createCommand(comand: string, chatChannel: any): Command {
    const baseCommand = comand.split(' ')[0].toLowerCase();
    switch (baseCommand) {
      case '!sort-old':
        return new SortCommand(comand, chatChannel);
      case '!sort':
      case '!sort-r':
        return new SortRankedCommand(comand, chatChannel);
      case '!list-all':
        return new ListPlayersCommand(comand, chatChannel);
      case '!list':
        return new ListOnlinePlayersCommand(comand, chatChannel);
      case '!go':
        return new GoCommand(comand, chatChannel);
      case '!lobby':
        return new RegroupCommand(comand, chatChannel);
      case '!replay':
        return new ReplaySortCommand(comand, chatChannel);
      case '!help':
        return new HelpCommand(comand, chatChannel);
      case '!swap':
        return new SwapCommand(comand, chatChannel);
      default:
        throw new Error('Unknown command type');
    }
  }
}

export default CommandFactory;
