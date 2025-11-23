import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let calculatePoint;

beforeAll(async () => {
  // Load the wasm_exec.js helper from Go
  const wasmExecPath = join(__dirname, '../../wasm/go/wasm_exec.js');
  const wasmExecCode = await readFile(wasmExecPath, 'utf-8');
  
  // Create a minimal global environment for Go WASM
  global.global = global;
  global.require = (await import('module')).createRequire(import.meta.url);
  global.fs = await import('fs');
  
  // Only set properties if they don't already exist
  if (!global.TextEncoder) global.TextEncoder = TextEncoder;
  if (!global.TextDecoder) global.TextDecoder = TextDecoder;
  if (!global.performance) global.performance = performance;
  if (!global.crypto) {
    const cryptoModule = await import('crypto');
    global.crypto = cryptoModule.webcrypto || cryptoModule;
  }
  
  // Execute wasm_exec.js to get the Go class
  eval(wasmExecCode);
  
  // Load the Go WebAssembly module
  const go = new global.Go();
  const wasmPath = join(__dirname, '../../wasm/go/mandelbrot.wasm');
  const wasmBuffer = await readFile(wasmPath);
  const wasmModule = await WebAssembly.instantiate(wasmBuffer, go.importObject);
  
  // Run the Go program (this registers the calculatePoint function)
  go.run(wasmModule.instance);
  
  // Get the calculatePoint function from global scope
  calculatePoint = global.calculatePoint;
});

describe('Go WebAssembly Mandelbrot Calculation - Property Tests', () => {
  
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
});
