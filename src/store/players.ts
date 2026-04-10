import { buildPlayerAttributes } from '@src/domain/models/Player';
import type PlayerInfo from '@src/types/playersInfo';

interface Players {
  [key: string]: PlayerInfo;
}

function createSeedAttributes(
  activeFlags: Partial<Record<'support' | 'tank' | 'carry', boolean>> = {}
) {
  return buildPlayerAttributes(activeFlags);
}

export const players: Players = {
  '_crossover_': {
    dotaName: 'Crossover',
    rank: 4,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 90 },
      tank: { isActive: true, proficiency: 80 },
    },
  },
  aldobarrera: {
    dotaName: 'Virtual',
    rank: 2,
    attributes: {
      support: { isActive: true, proficiency: 10 },
      carry: { isActive: true, proficiency: 20 },
      tank: { isActive: true, proficiency: 50 },
    },
  },
  alvaroavilaperez: {
    dotaName: 'Capcom',
    rank: 2,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 40 },
      tank: { isActive: true, proficiency: 60 },
    },
  },
  'ariel.patino': {
    dotaName: 'Vulture',
    rank: 4,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  carryover_26503: {
    dotaName: 'Carryover',
    rank: 0,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: false, proficiency: 0 },
    },
  },
  cute_badger_46120: {
    dotaName: 'neo',
    rank: 3,
    attributes: {
      support: { isActive: true, proficiency: 60 },
      carry: { isActive: true, proficiency: 10 },
      tank: { isActive: true, proficiency: 90 },
    },
  },
  'franco.fral': {
    dotaName: 'Melapelas',
    rank: 3,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 40 },
      tank: { isActive: true, proficiency: 60 },
    },
  },
  gibranjs: {
    dotaName: 'Dex',
    rank: 4,
    attributes: {
      support: { isActive: true, proficiency: 70 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: false, proficiency: 20 },
    },
  },
  hodric3734: {
    dotaName: 'Hodric',
    rank: 2.5,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: false, proficiency: 5 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  hodrick_45678: {
    dotaName: 'Hodric',
    rank: 2.5,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: false, proficiency: 5 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  huancar1758: {
    dotaName: 'Neo',
    rank: 3,
    attributes: {
      support: { isActive: true, proficiency: 60 },
      carry: { isActive: true, proficiency: 10 },
      tank: { isActive: true, proficiency: 90 },
    },
  },
  isrgks77: {
    dotaName: 'isrgks',
    rank: 5,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: false, proficiency: 0 },
    },
  },
  itachi071641: {
    dotaName: 'Itachi',
    rank: 4,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: true, proficiency: 40 },
    },
  },
  joseluis6950: {
    dotaName: 'Itachi',
    rank: 4,
    attributes: {
      support: { isActive: false, proficiency: 0 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: true, proficiency: 40 },
    },
  },
  'keishie.': {
    dotaName: 'Keishie',
    rank: 2,
    attributes: {
      support: { isActive: true, proficiency: 30 },
      carry: { isActive: false, proficiency: 0 },
      tank: { isActive: true, proficiency: 40 },
    },
  },
  lokogangan: {
    dotaName: 'Loko',
    rank: 0,
    attributes: {
      support: { isActive: true, proficiency: 30 },
      carry: { isActive: false, proficiency: 0 },
      tank: { isActive: true, proficiency: 10 },
    },
  },
  m4700839: {
    dotaName: 'Mato',
    rank: 4,
    attributes: {
      support: { isActive: true, proficiency: 95 },
      carry: { isActive: true, proficiency: 90 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  marchelo107: {
    dotaName: 'marchelo107',
    rank: 2.5,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: true, proficiency: 50 },
      tank: { isActive: true, proficiency: 50 },
    },
  },
  mato4130: {
    dotaName: 'Mato',
    rank: 4,
    attributes: {
      support: { isActive: true, proficiency: 95 },
      carry: { isActive: true, proficiency: 90 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  mcadimad: {
    dotaName: 'MCadima',
    rank: 3.5,
    attributes: {
      support: { isActive: true, proficiency: 20 },
      carry: { isActive: true, proficiency: 60 },
      tank: { isActive: true, proficiency: 60 },
    },
  },
  'mcadimad.': {
    dotaName: 'MCadima',
    rank: 1.5,
    attributes: {
      support: { isActive: true, proficiency: 20 },
      carry: { isActive: true, proficiency: 60 },
      tank: { isActive: true, proficiency: 60 },
    },
  },
  'mgc0.': {
    dotaName: 'Mgco',
    rank: 4.5,
    attributes: {
      support: { isActive: true, proficiency: 80 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
  notysimo4092: {
    dotaName: 'drPato',
    rank: 3,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: true, proficiency: 20 },
      tank: { isActive: true, proficiency: 60 },
    },
  },
  rampage055646: {
    dotaName: 'Rampage',
    rank: 5,
    attributes: {
      support: { isActive: true, proficiency: 100 },
      carry: { isActive: true, proficiency: 100 },
      tank: { isActive: true, proficiency: 100 },
    },
  },
  rampage09283: {
    dotaName: 'Rampage',
    rank: 5,
    attributes: {
      support: { isActive: true, proficiency: 100 },
      carry: { isActive: true, proficiency: 100 },
      tank: { isActive: true, proficiency: 100 },
    },
  },
  rampage4237: {
    dotaName: 'Rampage',
    rank: 5,
    attributes: {
      support: { isActive: true, proficiency: 100 },
      carry: { isActive: true, proficiency: 100 },
      tank: { isActive: true, proficiency: 100 },
    },
  },
  richarde4999: {
    dotaName: 'Ecos',
    rank: 0,
    attributes: createSeedAttributes({ tank: true }),
  },
  rokko6963: {
    dotaName: 'rokko',
    rank: 0,
    attributes: createSeedAttributes({ tank: true }),
  },
  vicho9622: {
    dotaName: 'Vicho',
    rank: 2,
    attributes: createSeedAttributes({ carry: true }),
  },
  vulture_255: {
    dotaName: 'Vulture',
    rank: 4,
    attributes: {
      support: { isActive: true, proficiency: 50 },
      carry: { isActive: true, proficiency: 80 },
      tank: { isActive: true, proficiency: 70 },
    },
  },
};
