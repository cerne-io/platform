import { describe, it, expect } from 'vitest';
import { cartesianToBarycentric, barycentricToCartesian, isValidTriadPoint } from '../triadGeometry';

describe('triadGeometry', () => {

  describe('isValidTriadPoint', () => {
    it('accepts valid points that sum to 1', () => {
      expect(isValidTriadPoint({ a: 1, b: 0, c: 0 })).toBe(true);
      expect(isValidTriadPoint({ a: 1/3, b: 1/3, c: 1/3 })).toBe(true);
      expect(isValidTriadPoint({ a: 0.5, b: 0.5, c: 0 })).toBe(true);
    });

    it('rejects points that do not sum to 1', () => {
      expect(isValidTriadPoint({ a: 1, b: 1, c: 0 })).toBe(false);
      expect(isValidTriadPoint({ a: 0.5, b: 0.5, c: 0.5 })).toBe(false);
    });

    it('rejects points with negative components', () => {
      expect(isValidTriadPoint({ a: 1.2, b: -0.2, c: 0 })).toBe(false);
    });

    it('accepts points with tiny floating point negative errors', () => {
      expect(isValidTriadPoint({ a: 1, b: -1e-12, c: 1e-12 })).toBe(true);
    });
  });

  describe('cartesianToBarycentric', () => {
    it('converts top vertex correctly', () => {
      const res = cartesianToBarycentric({ x: 50, y: 0 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.a).toBeCloseTo(1);
        expect(res.value.b).toBeCloseTo(0);
        expect(res.value.c).toBeCloseTo(0);
      }
    });

    it('converts bottom left vertex correctly', () => {
      const res = cartesianToBarycentric({ x: 0, y: 100 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.a).toBeCloseTo(0);
        expect(res.value.b).toBeCloseTo(1);
        expect(res.value.c).toBeCloseTo(0);
      }
    });

    it('converts bottom right vertex correctly', () => {
      const res = cartesianToBarycentric({ x: 100, y: 100 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.a).toBeCloseTo(0);
        expect(res.value.b).toBeCloseTo(0);
        expect(res.value.c).toBeCloseTo(1);
      }
    });

    it('converts center correctly', () => {
      const centerCartesian = barycentricToCartesian({ a: 1/3, b: 1/3, c: 1/3 });
      const res = cartesianToBarycentric(centerCartesian);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.a).toBeCloseTo(1/3);
        expect(res.value.b).toBeCloseTo(1/3);
        expect(res.value.c).toBeCloseTo(1/3);
      }
    });

    it('rejects points outside the triangle', () => {
      // (0,0) is outside the triangle (top left corner of bounding box)
      const res = cartesianToBarycentric({ x: 0, y: 0 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("outside_triangle");
      }
    });

    it('round trips successfully', () => {
      const original = { a: 0.2, b: 0.5, c: 0.3 };
      const cartesian = barycentricToCartesian(original);
      const res = cartesianToBarycentric(cartesian);
      
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.a).toBeCloseTo(original.a);
        expect(res.value.b).toBeCloseTo(original.b);
        expect(res.value.c).toBeCloseTo(original.c);
      }
    });
  });
});
