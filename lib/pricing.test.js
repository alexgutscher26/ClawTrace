import { describe, expect, test } from 'bun:test';
import { MODEL_PRICING } from './pricing';

describe('MODEL_PRICING', () => {
  test('should verify pricing for common models', () => {
    expect(MODEL_PRICING['claude-sonnet-4']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();
  });

  test('should have positive pricing values', () => {
    Object.values(MODEL_PRICING).forEach((price) => {
      expect(price).toBeGreaterThan(0);
    });
  });
});
