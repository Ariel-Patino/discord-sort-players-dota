import Commands from '../types/commands';

const validCommands: Commands[] = [
  '!sort',
  '!list',
  '!listall',
  '!go',
  '!lobby',
  '!replay',
  '!help',
  '!swap',
  '!setrank',
  '!setrole',
  '!move',
];

const isValidCommandType = (type: string): type is Commands => {
  return validCommands.includes(type.toLowerCase() as Commands);
};

export default isValidCommandType;
