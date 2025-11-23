import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { iterationToColor, generatePalette, SET_COLOR } from '../../src/colorPalette.js';

describe('ColorPalette - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 9: Iteration count maps to valid color
  test('Property 9: Iteration count maps to valid color', () => {
    fc.assert(
      fc.property(
        // Generate random iteration count
        fc.integer({ min: 0, max: 10000 }),
        // Generate random maxIterations (must be >= iterations)
        fc.integer({ min: 1, max: 10000 }),
        // Generate optional z magnitude for smooth coloring
        fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: null }),
        // Generate optional custom palette size
        fc.option(fc.integer({ min: 10, max: 1000 }), { nil: null }),
        (iterations, maxIterations, zMagnitude, paletteSize) => {
          // Ensure iterations <= maxIterations
          const validIterations = Math.min(iterations, maxIterations);
          
          // Generate custom palette if size is provided
          const palette = paletteSize ? generatePalette(paletteSize) : undefined;
          
          // Get color for the iteration count
          const color = iterationToColor(validIterations, maxIterations, zMagnitude, palette);
          
          // Verify that the color is a valid RGB object
          expect(color).toBeDefined();
          expect(color).toHaveProperty('r');
          expect(color).toHaveProperty('g');
          expect(color).toHaveProperty('b');
          
          // Verify that all color components are in the valid range [0, 255]
          expect(color.r).toBeGreaterThanOrEqual(0);
          expect(color.r).toBeLessThanOrEqual(255);
          expect(color.g).toBeGreaterThanOrEqual(0);
          expect(color.g).toBeLessThanOrEqual(255);
          expect(color.b).toBeGreaterThanOrEqual(0);
          expect(color.b).toBeLessThanOrEqual(255);
          
          // Verify that color components are integers
          expect(Number.isInteger(color.r)).toBe(true);
          expect(Number.isInteger(color.g)).toBe(true);
          expect(Number.isInteger(color.b)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 10: Maximum iterations map to set color
  test('Property 10: Maximum iterations map to set color', () => {
    fc.assert(
      fc.property(
        // Generate random maxIterations
        fc.integer({ min: 1, max: 10000 }),
        // Generate optional z magnitude for smooth coloring
        fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: null }),
        // Generate optional custom palette size
        fc.option(fc.integer({ min: 10, max: 1000 }), { nil: null }),
        (maxIterations, zMagnitude, paletteSize) => {
          // Generate custom palette if size is provided
          const palette = paletteSize ? generatePalette(paletteSize) : undefined;
          
          // Get color when iterations equals maxIterations (point in the set)
          const color = iterationToColor(maxIterations, maxIterations, zMagnitude, palette);
          
          // Verify that the color is exactly the designated set color (black)
          expect(color).toEqual(SET_COLOR);
          expect(color.r).toBe(0);
          expect(color.g).toBe(0);
          expect(color.b).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
