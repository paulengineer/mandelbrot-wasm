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
});
