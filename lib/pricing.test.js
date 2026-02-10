import { expect, test, describe } from 'bun:test';
import { MODEL_PRICING } from './pricing';

describe('MODEL_PRICING', () => {
  test('should contain pricing for supported models', () => {
    expect(MODEL_PRICING).toHaveProperty('claude-sonnet-4');
    expect(MODEL_PRICING).toHaveProperty('gpt-4o');
    expect(MODEL_PRICING).toHaveProperty('gpt-4');
  });

  test('values should be numbers', () => {
    for (const key in MODEL_PRICING) {
      expect(typeof MODEL_PRICING[key]).toBe('number');
    }
  });
});
