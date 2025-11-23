import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let wasmInstance;

beforeAll(async () => {
  // Load the Moonbit WebAssembly module
  const wasmPath = join(__dirname, '../../wasm/moonbit/build/mandelbrot.wasm');
  const wasmBuffer = await readFile(wasmPath);
  
  // Instantiate the WASM module
  const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
    // Moonbit may need some imports, provide minimal environment
    spectest: {
      print_i32: (x) => console.log(x),
      print_f64: (x) => console.log(x),
    }
  });
  
  wasmInstance = wasmModule.instance;
});

describe('Moonbit WebAssembly Mandelbrot Calculation - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 2: Iteration count bounded by maximum
  test('Property 2: Iteration count is always bounded by maximum', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3, max: 3, noNaN: true }),  // real component
        fc.double({ min: -3, max: 3, noNaN: true }),  // imaginary component
        fc.integer({ min: 1, max: 1000 }),            // max_iterations
        fc.double({ min: 1.5, max: 10, noNaN: true }), // escape_radius
        (real, imag, maxIterations, escapeRadius) => {
          const result = wasmInstance.exports.calculatePoint(real, imag, maxIterations, escapeRadius);
          
          // The returned iteration count must be <= maxIterations
          expect(result).toBeLessThanOrEqual(maxIterations);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
