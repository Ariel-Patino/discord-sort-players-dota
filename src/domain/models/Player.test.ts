import { describe, expect, it } from '@jest/globals';
import {
  buildPlayerAttributes,
  normalizePlayerAttributes,
} from './Player';

describe('Player attributes', () => {
  it('keeps proficiency values as integers within the 0-100 range', () => {
    const attributes = normalizePlayerAttributes({
      support: { isActive: true, proficiency: 72.8 },
      tank: { isActive: false, proficiency: -10 },
      carry: { isActive: true, proficiency: 150 },
    });

    expect(attributes.support).toEqual({ isActive: true, proficiency: 73 });
    expect(attributes.tank).toEqual({ isActive: false, proficiency: 0 });
    expect(attributes.carry).toEqual({ isActive: true, proficiency: 100 });
  });

  it('maps canonical tank flags into the normalized attribute object', () => {
    const attributes = normalizePlayerAttributes(undefined, {
      support: true,
      tank: true,
      carry: false,
    });

    expect(attributes).toMatchObject({
      support: { isActive: true, proficiency: 50 },
      tank: { isActive: true, proficiency: 50 },
      carry: { isActive: false, proficiency: 50 },
    });
  });

  it('builds default role attributes with an optional shared proficiency', () => {
    const attributes = buildPlayerAttributes({ support: true, carry: true }, 64.4);

    expect(attributes.support).toEqual({ isActive: true, proficiency: 64 });
    expect(attributes.carry).toEqual({ isActive: true, proficiency: 64 });
    expect(attributes.tank).toEqual({ isActive: false, proficiency: 64 });
  });
});
