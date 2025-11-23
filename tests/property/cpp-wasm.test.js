import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let wasmModule;

beforeAll(async () => {
  // Load the C++ WebAssembly module
  const Module = (await import('../../wasm/cpp/mandelbrot.js')).default;
  
  wasmModule = await Module({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return join(__dirname, '../../wasm/cpp', path);
      }
      return path;
    }
  });
});

describe('C++ WebAssembly Mandelbrot Calculation - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 2: Iteration count bounded by maximum
  test('Property 2: Iteration count is always bounded by maximum', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3, max: 3, noNaN: true }),  // real component
        fc.double({ min: -3, max: 3, noNaN: true }),  // imaginary component
        fc.integer({ min: 1, max: 1000 }),            // max_iterations
        fc.double({ min: 1.5, max: 10, noNaN: true }), // escape_radius
        (real, imag, maxIterations, escapeRadius) => {
          const result = wasmModule._calculatePoint(real, imag, maxIterations, escapeRadius);
          
          // The returned iteration count must be <= maxIterations
          expect(result).toBeLessThanOrEqual(maxIterations);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
