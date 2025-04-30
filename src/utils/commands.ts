import Commands from '../types/commands';

const validCommads: Commands[] = ['!sort-old', '!sort', '!list-p', '!sort-r'];

const isValidCommandType = (type: string): type is Commands => {
  return validCommads.includes(type as Commands);
};

export default isValidCommandType;
