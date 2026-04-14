import { describe, expect, it } from '@jest/globals';
import { type Player } from '@src/domain/models/Player';
import Dota1MatchmakingStrategy from './Dota1MatchmakingStrategy';

function createPlayer(
  id: string,
  rank: number,
  activeFlags: Partial<Record<'support' | 'tank' | 'carry', boolean>> = {},
  proficiencies: Partial<Record<'support' | 'tank' | 'carry', number>> = {}
): Player {
  const attributes: Record<string, number> = {};

  for (const [key, isActive] of Object.entries(activeFlags)) {
    attributes[key] = isActive
      ? proficiencies[key as 'support' | 'tank' | 'carry'] ?? 90
      : 0;
  }

  return {
    id,
    externalId: id,
    displayName: id,
    rank,
    attributes,
  };
}

describe('Dota1MatchmakingStrategy', () => {
  const provider = new Dota1MatchmakingStrategy();

  it('returns the expected 5v5 role constraints', () => {
    const constraints = provider.getConstraintsForTeamSize(5);

    expect(constraints).toHaveLength(3);
    expect(constraints.map((constraint) => constraint.attribute)).toEqual([
      'carry',
      'tank',
      'support',
    ]);
    expect(constraints.every((constraint) => constraint.minCount === 1)).toBe(true);
    expect(constraints.every((constraint) => constraint.minProficiency === 60)).toBe(true);
  });

  it('returns stricter 4v4 carry/support constraints', () => {
    const constraints = provider.getConstraintsForTeamSize(4);

    expect(constraints).toHaveLength(2);
    expect(constraints.map((constraint) => constraint.attribute)).toEqual([
      'carry',
      'support',
    ]);
    expect(constraints.every((constraint) => constraint.minProficiency === 80)).toBe(true);
  });

  it('returns no role constraints for 3v3 or smaller', () => {
    expect(provider.getConstraintsForTeamSize(3)).toEqual([]);
    expect(provider.getConstraintsForTeamSize(2)).toEqual([]);
  });

  it('evaluates proficiency thresholds with strict greater-than semantics', () => {
    const evaluations = provider.evaluateTeam(
      [
        createPlayer('carry-main', 4.5, { carry: true }, { carry: 81 }),
        createPlayer('support-80', 3.2, { support: true }, { support: 80 }),
        createPlayer('support-92', 3.1, { support: true }, { support: 92 }),
        createPlayer('frontliner', 3.8, { tank: true }, { tank: 77 }),
      ],
      4
    );

    const carryRule = evaluations.find((entry) => entry.constraint.attribute === 'carry');
    const supportRule = evaluations.find((entry) => entry.constraint.attribute === 'support');

    expect(carryRule?.satisfied).toBe(true);
    expect(carryRule?.matchedPlayerIds).toEqual(['carry-main']);
    expect(supportRule?.satisfied).toBe(true);
    expect(supportRule?.matchedPlayerIds).toEqual(['support-92']);
  });
});
