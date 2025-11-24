import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let wasmModule;

beforeAll(async () => {
  // Load the Rust WebAssembly module
  const wasmInit = await import('../../wasm/rust/pkg/mandelbrot_wasm_rust.js');
  const wasmPath = join(__dirname, '../../wasm/rust/pkg/mandelbrot_wasm_rust_bg.wasm');
  const wasmBuffer = await readFile(wasmPath);
  await wasmInit.default(wasmBuffer);
  wasmModule = wasmInit;
});

describe('Rust WebAssembly Mandelbrot Calculation - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 2: Iteration count bounded by maximum
  test('Property 2: Iteration count is always bounded by maximum', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3, max: 3, noNaN: true }),  // real component
        fc.double({ min: -3, max: 3, noNaN: true }),  // imaginary component
        fc.integer({ min: 1, max: 1000 }),            // max_iterations
        fc.double({ min: 1.5, max: 10, noNaN: true }), // escape_radius
        (real, imag, maxIterations, escapeRadius) => {
          const result = wasmModule.calculate_point(real, imag, maxIterations, escapeRadius);
          
          // The returned iteration count must be <= maxIterations
          expect(result).toBeLessThanOrEqual(maxIterations);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 3: Escape detection accuracy
  test('Property 3: Escape detection is accurate', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3, max: 3, noNaN: true }),  // real component
        fc.double({ min: -3, max: 3, noNaN: true }),  // imaginary component
        fc.integer({ min: 10, max: 500 }),            // max_iterations
        fc.constant(2.0),                              // escape_radius (standard value)
        (real, imag, maxIterations, escapeRadius) => {
          const result = wasmModule.calculate_point(real, imag, maxIterations, escapeRadius);
          
          // If the point escaped (result < maxIterations), verify it manually
          if (result < maxIterations) {
            let zReal = 0.0;
            let zImag = 0.0;
            const escapeRadiusSquared = escapeRadius * escapeRadius;
            
            // Iterate up to the returned count
            for (let i = 0; i < result; i++) {
              const zMagnitudeSquared = zReal * zReal + zImag * zImag;
              
              // Before the escape iteration, point should not have escaped
              expect(zMagnitudeSquared).toBeLessThanOrEqual(escapeRadiusSquared);
              
              // Calculate z = z^2 + c
              const zRealTemp = zReal * zReal - zImag * zImag + real;
              zImag = 2.0 * zReal * zImag + imag;
              zReal = zRealTemp;
            }
            
            // At the escape iteration, point should have escaped
            const finalMagnitudeSquared = zReal * zReal + zImag * zImag;
            expect(finalMagnitudeSquared).toBeGreaterThan(escapeRadiusSquared);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 4: Non-escaping points return maximum iterations
  test('Property 4: Non-escaping points return maximum iterations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Known points definitely in the Mandelbrot set
          [0.0, 0.0],      // Origin - definitely in set
          [-0.5, 0.0],     // On the real axis - in set
          [-0.1, 0.0],     // Near origin - in set
          [0.0, 0.1],      // Near origin on imaginary axis - in set
          [-0.2, 0.0],     // Inside main cardioid - in set
        ),
        fc.integer({ min: 100, max: 1000 }),  // Use higher iteration counts
        fc.constant(2.0),
        ([real, imag], maxIterations, escapeRadius) => {
          const result = wasmModule.calculate_point(real, imag, maxIterations, escapeRadius);
          
          // Points known to be in the Mandelbrot set should return maxIterations
          expect(result).toBe(maxIterations);
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
          
          const result = wasmModule.calculate_mandelbrot_set(realArray, imagArray, maxIterations, escapeRadius);
          
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
          
          // Calculate using batch API
          const batchResults = wasmModule.calculate_mandelbrot_set(realArray, imagArray, maxIterations, escapeRadius);
          
          // Calculate each point individually using the single-point API
          const individualResults = coordPairs.map(([real, imag]) => 
            wasmModule.calculate_point(real, imag, maxIterations, escapeRadius)
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
