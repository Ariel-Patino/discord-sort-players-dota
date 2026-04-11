import type Commands from '@src/types/commands';
import Command, { type CommandMessage } from './Command';
import ListPlayersCommand from '../players/ListPlayersCommand';
import ListOnlinePlayersCommand from '../players/ListOnlinePlayersCommand';
import ReplaySortCommand from '../game/ReplaySortCommand';
import SortRankedCommand from '../game/SortRankedCommand';
import RegroupCommand from '../game/RegroupCommand';
import GoCommand from '../game/GoCommand';
import HelpCommand from './HelpCommand';
import SwapCommand from '../game/SwapCommand';
import SetRankCommand from '../game/SetRankCommand';
import SetAttributeCommand from '../game/SetAttributeCommand';
import MoveCommand from '../game/MoveCommand';

type CommandFactoryEntry = (
  command: string,
  chatChannel: CommandMessage
) => Command;

const commandRegistry: Record<Commands, CommandFactoryEntry> = {
  '!sort': (command, chatChannel) => new SortRankedCommand(command, chatChannel),
  '!listall': (command, chatChannel) => new ListPlayersCommand(command, chatChannel),
  '!list': (command, chatChannel) => new ListOnlinePlayersCommand(command, chatChannel),
  '!go': (command, chatChannel) => new GoCommand(command, chatChannel),
  '!lobby': (command, chatChannel) => new RegroupCommand(command, chatChannel),
  '!replay': (command, chatChannel) => new ReplaySortCommand(command, chatChannel),
  '!help': (command, chatChannel) => new HelpCommand(command, chatChannel),
  '!swap': (command, chatChannel) => new SwapCommand(command, chatChannel),
  '!setrank': (command, chatChannel) => new SetRankCommand(command, chatChannel),
  '!setattribute': (command, chatChannel) =>
    new SetAttributeCommand(command, chatChannel),
  '!move': (command, chatChannel) => new MoveCommand(command, chatChannel),
};

class CommandFactory {
  static createCommand(command: string, chatChannel: CommandMessage): Command {
    const baseCommand = command.split(' ')[0].toLowerCase() as Commands;
    const factoryEntry = commandRegistry[baseCommand];

    if (!factoryEntry) {
      throw new Error('Unknown command type');
    }

    return factoryEntry(command, chatChannel);
  }
}

export default CommandFactory;
