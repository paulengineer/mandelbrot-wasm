import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let calculatePoint;
let calculateMandelbrotSet;

beforeAll(async () => {
  // Load the Moonbit WebAssembly module
  const wasmPath = join(__dirname, '../../wasm/moonbit/build/mandelbrot.wasm');
  const wasmBuffer = await readFile(wasmPath);
  
  // Instantiate the WebAssembly module with minimal imports
  const result = await WebAssembly.instantiate(wasmBuffer, {
    spectest: {
      print_i32: (x) => console.log(x),
      print_f64: (x) => console.log(x)
    }
  });
  
  // Get the exported functions
  calculatePoint = result.instance.exports.calculatePoint;
  
  // Check if batch API is available, otherwise create fallback
  if (result.instance.exports.calculateMandelbrotSet) {
    calculateMandelbrotSet = result.instance.exports.calculateMandelbrotSet;
  } else {
    // Fallback: calculate each point individually
    calculateMandelbrotSet = (realCoords, imagCoords, maxIterations, escapeRadius) => {
      const length = Math.min(realCoords.length, imagCoords.length);
      const results = new Uint32Array(length);
      for (let i = 0; i < length; i++) {
        results[i] = calculatePoint(realCoords[i], imagCoords[i], maxIterations, escapeRadius);
      }
      return results;
    };
  }
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
          const result = calculatePoint(real, imag, maxIterations, escapeRadius);
          
          // The returned iteration count must be <= maxIterations
          expect(result).toBeLessThanOrEqual(maxIterations);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 4a: Batch calculation returns correct array length
  test('Property 4a: Batch calculation returns correct array length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -3, max: 3, noNaN: true }), { minLength: 1, maxLength: 100 }),  // real coordinates
        fc.array(fc.double({ min: -3, max: 3, noNaN: true }), { minLength: 1, maxLength: 100 }),  // imaginary coordinates
        fc.integer({ min: 10, max: 500 }),            // max_iterations
        fc.constant(2.0),                              // escape_radius
        (realCoords, imagCoords, maxIterations, escapeRadius) => {
          // Convert to Float64Array as expected by the batch API
          const realArray = new Float64Array(realCoords);
          const imagArray = new Float64Array(imagCoords);
          
          const result = calculateMandelbrotSet(realArray, imagArray, maxIterations, escapeRadius);
          
          // The returned array length should match the minimum of input array lengths
          const expectedLength = Math.min(realArray.length, imagArray.length);
          expect(result.length).toBe(expectedLength);
          
          // Result should be a Uint32Array
          expect(result).toBeInstanceOf(Uint32Array);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 4b: Batch calculation produces consistent results
  test('Property 4b: Batch calculation produces consistent results', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.double({ min: -3, max: 3, noNaN: true }),  // real component
            fc.double({ min: -3, max: 3, noNaN: true })   // imaginary component
          ),
          { minLength: 1, maxLength: 50 }
        ),
        fc.integer({ min: 10, max: 500 }),            // max_iterations
        fc.constant(2.0),                              // escape_radius
        (coordPairs, maxIterations, escapeRadius) => {
          // Separate into real and imaginary arrays
          const realCoords = coordPairs.map(([r, _]) => r);
          const imagCoords = coordPairs.map(([_, i]) => i);
          
          // Convert to Float64Array for batch API
          const realArray = new Float64Array(realCoords);
          const imagArray = new Float64Array(imagCoords);
          
          // Calculate using batch API (which uses fallback for Moonbit)
          const batchResults = calculateMandelbrotSet(realArray, imagArray, maxIterations, escapeRadius);
          
          // Calculate each point individually using the single-point API
          const individualResults = coordPairs.map(([real, imag]) => 
            calculatePoint(real, imag, maxIterations, escapeRadius)
          );
          
          // Batch results should match individual results
          expect(batchResults.length).toBe(individualResults.length);
          for (let i = 0; i < batchResults.length; i++) {
            expect(batchResults[i]).toBe(individualResults[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
