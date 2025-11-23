import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { RenderEngine } from '../../src/renderEngine.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('RenderEngine - Canvas Scaling Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 14: Canvas scales on zoom
  test('Property 14: Canvas scales on zoom', () => {
    fc.assert(
      fc.property(
        // Generate random canvas dimensions
        fc.integer({ min: 400, max: 1920 }),
        fc.integer({ min: 300, max: 1080 }),
        // Generate random zoom factor (0.5 to 2.0)
        fc.double({ min: 0.5, max: 2.0 }),
        // Generate random focal point coordinates (as fractions of canvas size)
        fc.double({ min: 0.1, max: 0.9 }),
        fc.double({ min: 0.1, max: 0.9 }),
        (canvasWidth, canvasHeight, zoomFactor, focalXFraction, focalYFraction) => {
          // Create canvas
          const canvas = createCanvas(canvasWidth, canvasHeight);
          const ctx = canvas.getContext('2d');
          
          // Fill canvas with a test pattern so we can verify scaling occurred
          // Draw a simple gradient pattern
          const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
          gradient.addColorStop(0, 'red');
          gradient.addColorStop(0.5, 'green');
          gradient.addColorStop(1, 'blue');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Capture the original canvas state
          const originalImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          }, canvasWidth, canvasHeight);
          
          // Create mock WASM module
          const mockWasmModule = {
            calculatePoint: vi.fn().mockReturnValue(100)
          };
          
          // Create render engine
          const renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
          
          // Calculate focal point in pixels
          const focalX = Math.floor(canvasWidth * focalXFraction);
          const focalY = Math.floor(canvasHeight * focalYFraction);
          
          // Call scaleCanvas
          renderEngine.scaleCanvas(zoomFactor, focalX, focalY);
          
          // Capture the scaled canvas state
          const scaledImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
          
          // Verify that the canvas content has changed
          // (scaling should modify the canvas)
          let hasChanged = false;
          for (let i = 0; i < originalImageData.data.length; i += 4) {
            // Check if any pixel has changed
            if (originalImageData.data[i] !== scaledImageData.data[i] ||
                originalImageData.data[i + 1] !== scaledImageData.data[i + 1] ||
                originalImageData.data[i + 2] !== scaledImageData.data[i + 2]) {
              hasChanged = true;
              break;
            }
          }
          
          // For zoom factors significantly different from 1.0, the canvas should change
          // For zoom factors very close to 1.0, it might not change much
          if (Math.abs(zoomFactor - 1.0) > 0.05) {
            expect(hasChanged).toBe(true);
          }
          
          // Verify that scaleCanvas doesn't throw errors
          // (the fact that we got here means it succeeded)
          expect(true).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14 (variant): Canvas scaling preserves canvas dimensions', () => {
    fc.assert(
      fc.property(
        // Generate random canvas dimensions
        fc.integer({ min: 400, max: 1920 }),
        fc.integer({ min: 300, max: 1080 }),
        // Generate random zoom factor
        fc.double({ min: 0.5, max: 2.0 }),
        // Generate random focal point
        fc.double({ min: 0.1, max: 0.9 }),
        fc.double({ min: 0.1, max: 0.9 }),
        (canvasWidth, canvasHeight, zoomFactor, focalXFraction, focalYFraction) => {
          // Create canvas
          const canvas = createCanvas(canvasWidth, canvasHeight);
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          }, canvasWidth, canvasHeight);
          
          // Create mock WASM module
          const mockWasmModule = {
            calculatePoint: vi.fn().mockReturnValue(100)
          };
          
          // Create render engine
          const renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
          
          // Calculate focal point in pixels
          const focalX = Math.floor(canvasWidth * focalXFraction);
          const focalY = Math.floor(canvasHeight * focalYFraction);
          
          // Call scaleCanvas
          renderEngine.scaleCanvas(zoomFactor, focalX, focalY);
          
          // Verify canvas dimensions remain unchanged
          expect(canvas.width).toBe(canvasWidth);
          expect(canvas.height).toBe(canvasHeight);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14 (variant): Canvas scaling is immediate (synchronous)', () => {
    fc.assert(
      fc.property(
        // Generate random zoom factor (exclude values very close to 1.0)
        fc.double({ min: 0.5, max: 2.0 }).filter(z => Math.abs(z - 1.0) > 0.15),
        (zoomFactor) => {
          // Create canvas with fixed dimensions
          const canvas = createCanvas(800, 600);
          const ctx = canvas.getContext('2d');
          
          // Fill with a pattern that will show changes when scaled
          // Draw a gradient and some shapes
          const gradient = ctx.createLinearGradient(0, 0, 800, 600);
          gradient.addColorStop(0, 'red');
          gradient.addColorStop(0.5, 'green');
          gradient.addColorStop(1, 'blue');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 600);
          
          // Add some distinct shapes
          ctx.fillStyle = 'white';
          ctx.fillRect(100, 100, 200, 200);
          ctx.fillStyle = 'black';
          ctx.fillRect(500, 300, 150, 150);
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          }, 800, 600);
          
          // Create mock WASM module
          const mockWasmModule = {
            calculatePoint: vi.fn().mockReturnValue(100)
          };
          
          // Create render engine
          const renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
          
          // Capture state before scaling
          const beforeImageData = ctx.getImageData(0, 0, 800, 600);
          
          // Call scaleCanvas (should be synchronous)
          const startTime = performance.now();
          renderEngine.scaleCanvas(zoomFactor, 400, 300);
          const endTime = performance.now();
          
          // Capture state after scaling
          const afterImageData = ctx.getImageData(0, 0, 800, 600);
          
          // Verify that scaling completed immediately (within reasonable time)
          // Canvas operations should be very fast (< 100ms)
          const duration = endTime - startTime;
          expect(duration).toBeLessThan(100);
          
          // Verify that the canvas was modified
          // With a gradient and shapes, scaling should always produce visible changes
          let hasChanged = false;
          for (let i = 0; i < beforeImageData.data.length; i += 4) {
            if (beforeImageData.data[i] !== afterImageData.data[i] ||
                beforeImageData.data[i + 1] !== afterImageData.data[i + 1] ||
                beforeImageData.data[i + 2] !== afterImageData.data[i + 2]) {
              hasChanged = true;
              break;
            }
          }
          expect(hasChanged).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
