import { describe, it, expect } from 'vitest';
import { classifySliderPattern, classifyTrianglePattern } from '../continuousComparisonUtils';
import { DEFAULT_CONTINUOUS_THRESHOLDS } from '../continuousComparisonTypes';

describe('continuousComparisonUtils', () => {

  describe('classifySliderPattern', () => {
    it('classifies shift over spread when shift threshold is met', () => {
      const pattern = classifySliderPattern({
        absoluteShift: 25,
        spreadRatio: 2.0, // Both met, shift takes precedence
        thresholds: DEFAULT_CONTINUOUS_THRESHOLDS
      });
      expect(pattern).toBe('shift');
    });

    it('classifies spread when shift threshold is not met but spread is', () => {
      const pattern = classifySliderPattern({
        absoluteShift: 5,
        spreadRatio: 2.0, 
        thresholds: DEFAULT_CONTINUOUS_THRESHOLDS
      });
      expect(pattern).toBe('spread');
    });

    it('classifies similar when neither threshold is met', () => {
      const pattern = classifySliderPattern({
        absoluteShift: 5,
        spreadRatio: 1.1, 
        thresholds: DEFAULT_CONTINUOUS_THRESHOLDS
      });
      expect(pattern).toBe('similar');
    });
  });

  describe('classifyTrianglePattern', () => {
    it('classifies shift when largest delta meets threshold', () => {
      const pattern = classifyTrianglePattern({
        largestAbsoluteCornerDelta: 0.15,
        thresholds: DEFAULT_CONTINUOUS_THRESHOLDS
      });
      expect(pattern).toBe('shift');
    });

    it('classifies similar when largest delta is below threshold', () => {
      const pattern = classifyTrianglePattern({
        largestAbsoluteCornerDelta: 0.05,
        thresholds: DEFAULT_CONTINUOUS_THRESHOLDS
      });
      expect(pattern).toBe('similar');
    });
  });
});
