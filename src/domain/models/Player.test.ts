import { describe, expect, it } from '@jest/globals';
import {
  buildPlayerAttributes,
  normalizePlayerAttributes,
} from './Player';

describe('Player attributes', () => {
  it('keeps proficiency values as integers within the 0-100 range', () => {
    const attributes = normalizePlayerAttributes({
      support: 72.8,
      tank: -10,
      carry: 150,
    });

    expect(attributes.support).toBe(73);
    expect(attributes.tank).toBe(0);
    expect(attributes.carry).toBe(100);
  });

  it('drops unsupported legacy attribute payloads instead of coercing them', () => {
    const attributes = normalizePlayerAttributes({
      support: { isActive: true, proficiency: 72.8 },
      tank: true,
      carry: false,
    });

    expect(attributes).toEqual({
      support: 0,
      tank: 0,
      carry: 0,
    });
  });

  it('builds only the provided attributes using numeric values', () => {
    const attributes = buildPlayerAttributes({ support: 64.4, carry: 64.4 }, 64.4);

    expect(attributes.support).toBe(64);
    expect(attributes.carry).toBe(64);
    expect(attributes).not.toHaveProperty('tank');
  });

  it('preserves arbitrary dynamic attributes without injecting unrelated defaults', () => {
    const attributes = normalizePlayerAttributes({
      roamer: 74.2,
      jungler: 12,
    });

    expect(attributes).toEqual({
      roamer: 74,
      jungler: 12,
    });
    expect(attributes).not.toHaveProperty('support');
    expect(attributes).not.toHaveProperty('tank');
    expect(attributes).not.toHaveProperty('carry');
  });
});
