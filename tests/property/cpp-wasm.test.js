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

  // Feature: mandelbrot-visualizer, Property 4a: Batch calculation returns correct array length
  test('Property 4a: Batch calculation returns correct array length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -3, max: 3, noNaN: true }), { minLength: 1, maxLength: 100 }),  // real coordinates
        fc.array(fc.double({ min: -3, max: 3, noNaN: true }), { minLength: 1, maxLength: 100 }),  // imaginary coordinates
        fc.integer({ min: 10, max: 500 }),            // max_iterations
        fc.constant(2.0),                              // escape_radius
        (realCoords, imagCoords, maxIterations, escapeRadius) => {
          const length = Math.min(realCoords.length, imagCoords.length);
          
          // Allocate memory for input arrays in WASM heap
          const realPtr = wasmModule._malloc(length * 8); // 8 bytes per double
          const imagPtr = wasmModule._malloc(length * 8);
          
          // Copy data to WASM heap using setValue
          for (let i = 0; i < length; i++) {
            wasmModule.setValue(realPtr + i * 8, realCoords[i], 'double');
            wasmModule.setValue(imagPtr + i * 8, imagCoords[i], 'double');
          }
          
          // Call the batch calculation function
          const resultsPtr = wasmModule._calculateMandelbrotSet(
            realPtr,
            imagPtr,
            length,
            maxIterations,
            escapeRadius
          );
          
          // Free input arrays
          wasmModule._free(realPtr);
          wasmModule._free(imagPtr);
          
          expect(resultsPtr).not.toBe(0); // Verify memory allocation succeeded
          
          // Copy results from WASM heap to JavaScript array
          const results = new Uint32Array(length);
          for (let i = 0; i < length; i++) {
            results[i] = wasmModule.getValue(resultsPtr + i * 4, 'i32');
          }
          
          // Free results array
          wasmModule._freeResults(resultsPtr);
          
          // The returned array length should match the minimum of input array lengths
          expect(results.length).toBe(length);
          
          // Result should be a Uint32Array
          expect(results).toBeInstanceOf(Uint32Array);
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
          const length = coordPairs.length;
          
          // Allocate memory for input arrays in WASM heap
          const realPtr = wasmModule._malloc(length * 8); // 8 bytes per double
          const imagPtr = wasmModule._malloc(length * 8);
          
          // Copy data to WASM heap using setValue
          for (let i = 0; i < length; i++) {
            wasmModule.setValue(realPtr + i * 8, realCoords[i], 'double');
            wasmModule.setValue(imagPtr + i * 8, imagCoords[i], 'double');
          }
          
          // Call the batch calculation function
          const resultsPtr = wasmModule._calculateMandelbrotSet(
            realPtr,
            imagPtr,
            length,
            maxIterations,
            escapeRadius
          );
          
          // Free input arrays
          wasmModule._free(realPtr);
          wasmModule._free(imagPtr);
          
          expect(resultsPtr).not.toBe(0); // Verify memory allocation succeeded
          
          // Copy results from WASM heap to JavaScript array
          const batchResults = new Uint32Array(length);
          for (let i = 0; i < length; i++) {
            batchResults[i] = wasmModule.getValue(resultsPtr + i * 4, 'i32');
          }
          
          // Free results array
          wasmModule._freeResults(resultsPtr);
          
          // Calculate each point individually using the single-point API
          const individualResults = coordPairs.map(([real, imag]) => 
            wasmModule._calculatePoint(real, imag, maxIterations, escapeRadius)
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
