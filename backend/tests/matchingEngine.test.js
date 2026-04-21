import matchingEngine from '../utils/matchingEngine.js';

describe('MatchingEngine basic helpers', () => {
  test('familyNeedsToFeatureVector returns 6-length vector', () => {
    const familyNeeds = { requiredExperience: 5, budgetDaily: 100, requiredSkills: ['CPR'] };
    const vec = matchingEngine.familyNeedsToFeatureVector(familyNeeds);
    expect(Array.isArray(vec)).toBe(true);
    expect(vec.length).toBe(6);
  });

  test('calculateDistance symmetric and non-negative', () => {
    const v1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    const v2 = [0.2, 0.1, 0.4, 0.3, 0.6, 0.5];
    const d1 = matchingEngine.calculateDistance(v1, v2);
    const d2 = matchingEngine.calculateDistance(v2, v1);
    expect(d1).toBeCloseTo(d2);
    expect(d1).toBeGreaterThanOrEqual(0);
  });
});
