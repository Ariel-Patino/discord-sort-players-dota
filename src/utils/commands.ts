import Commands from '../types/commands';

const validCommads: Commands[] = ['!sort', '!sort-r', '!list-p'];

const isValidCommandType = (type: string): type is Commands => {
  return validCommads.includes(type as Commands);
};

export default isValidCommandType;
