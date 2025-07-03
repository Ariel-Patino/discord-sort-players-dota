import Commands from '../types/commands';

const validCommands: Commands[] = [
  '!sort-old',
  '!sort',
  '!list',
  '!sort-r',
  '!list-all',
  '!go',
  '!lobby',
  '!replay',
  '!help',
  '!swap',
  '!setrank',
];

const isValidCommandType = (type: string): type is Commands => {
  return validCommands.includes(type.toLowerCase() as Commands);
};

export default isValidCommandType;
