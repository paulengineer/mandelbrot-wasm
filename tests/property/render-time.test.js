import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RenderEngine } from '../../src/renderEngine.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('RenderEngine - Render Time Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 18: Accurate timing measurement
  test('Property 18: Accurate timing measurement', () => {
    fc.assert(
      fc.property(
        // Generate random canvas dimensions
        fc.integer({ min: 10, max: 100 }),  // canvasWidth (small for fast tests)
        fc.integer({ min: 10, max: 100 }),  // canvasHeight (small for fast tests)
        // Generate random calculation parameters
        fc.integer({ min: 50, max: 500 }),  // maxIterations
        (canvasWidth, canvasHeight, maxIterations) => {
          // Create canvas
          const canvas = createCanvas(canvasWidth, canvasHeight);
          
          // Create a mock WebAssembly module that simulates calculation time
          const mockWasmModule = {
            calculatePoint: (real, imag, maxIter, escapeRadius) => {
              // Simple Mandelbrot calculation
              let zReal = 0;
              let zImag = 0;
              let iterations = 0;
              
              while (iterations < maxIter && zReal * zReal + zImag * zImag < escapeRadius * escapeRadius) {
                const temp = zReal * zReal - zImag * zImag + real;
                zImag = 2 * zReal * zImag + imag;
                zReal = temp;
                iterations++;
              }
              
              return iterations;
            }
          };
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          });
          
          // Create render engine
          const renderEngine = new RenderEngine(
            canvas,
            mockWasmModule,
            viewportManager,
            { maxIterations, escapeRadius: 2.0 }
          );
          
          // Measure time manually using performance.now()
          const manualStartTime = performance.now();
          
          // Perform render and get returned time
          const returnedTime = renderEngine.render();
          
          const manualEndTime = performance.now();
          const manualElapsedTime = manualEndTime - manualStartTime;
          
          // Get stored render time
          const storedTime = renderEngine.getLastRenderTime();
          
          // Verify that returned time equals stored time
          expect(returnedTime).toBe(storedTime);
          
          // Verify that the returned time is a positive number
          expect(returnedTime).toBeGreaterThan(0);
          
          // Verify that the returned time is reasonable (not NaN or Infinity)
          expect(Number.isFinite(returnedTime)).toBe(true);
          
          // Verify that the returned time is close to the manually measured time
          // Allow for some overhead (timing measurement itself, function call overhead)
          // The returned time should be less than or equal to the manual measurement
          // (since manual measurement includes the timing logic itself)
          expect(returnedTime).toBeLessThanOrEqual(manualElapsedTime + 1); // +1ms tolerance
          
          // Verify that the timing is reasonable (not too far off)
          // The difference should be small (< 10ms for overhead)
          const timeDifference = Math.abs(returnedTime - manualElapsedTime);
          expect(timeDifference).toBeLessThan(10);
          
          // Verify that render time is stored and accessible
          expect(renderEngine.getLastRenderTime()).toBe(returnedTime);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify timing updates on subsequent renders
  test('Render time updates on subsequent renders', () => {
    fc.assert(
      fc.property(
        // Generate random canvas dimensions
        fc.integer({ min: 10, max: 50 }),  // canvasWidth
        fc.integer({ min: 10, max: 50 }),  // canvasHeight
        (canvasWidth, canvasHeight) => {
          // Create canvas
          const canvas = createCanvas(canvasWidth, canvasHeight);
          
          // Create a mock WebAssembly module
          const mockWasmModule = {
            calculatePoint: (real, imag, maxIter, escapeRadius) => {
              let zReal = 0;
              let zImag = 0;
              let iterations = 0;
              
              while (iterations < maxIter && zReal * zReal + zImag * zImag < escapeRadius * escapeRadius) {
                const temp = zReal * zReal - zImag * zImag + real;
                zImag = 2 * zReal * zImag + imag;
                zReal = temp;
                iterations++;
              }
              
              return iterations;
            }
          };
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          });
          
          // Create render engine
          const renderEngine = new RenderEngine(
            canvas,
            mockWasmModule,
            viewportManager
          );
          
          // Perform first render
          const firstRenderTime = renderEngine.render();
          const firstStoredTime = renderEngine.getLastRenderTime();
          
          // Verify first render time is stored
          expect(firstRenderTime).toBe(firstStoredTime);
          expect(firstRenderTime).toBeGreaterThan(0);
          
          // Perform second render
          const secondRenderTime = renderEngine.render();
          const secondStoredTime = renderEngine.getLastRenderTime();
          
          // Verify second render time is stored and updated
          expect(secondRenderTime).toBe(secondStoredTime);
          expect(secondRenderTime).toBeGreaterThan(0);
          
          // Verify that the stored time was updated (not the same as first render)
          // Note: Times might be very close, but the stored value should be updated
          expect(renderEngine.getLastRenderTime()).toBe(secondRenderTime);
        }
      ),
      { numRuns: 50 }
    );
  });
});
