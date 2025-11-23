import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { ViewportManager } from '../../src/viewportManager.js';

describe('ViewportManager - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 5: Pan translates viewport proportionally
  test('Property 5: Pan translates viewport proportionally', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // canvasWidth
        fc.integer({ min: 100, max: 2000 }),  // canvasHeight
        // Generate random pan deltas
        fc.integer({ min: -500, max: 500 }),  // deltaX
        fc.integer({ min: -500, max: 500 }),  // deltaY
        (initialBounds, canvasWidth, canvasHeight, deltaX, deltaY) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Create viewport with initial bounds and enforce aspect ratio
          const viewport = new ViewportManager(initialBounds, canvasWidth, canvasHeight);
          
          // Get initial bounds (after aspect ratio enforcement)
          const beforeBounds = viewport.getBounds();
          const initialRealRange = beforeBounds.maxReal - beforeBounds.minReal;
          const initialImagRange = beforeBounds.maxImag - beforeBounds.minImag;
          
          // Calculate expected complex plane deltas based on pixel deltas
          const expectedRealDelta = (deltaX / canvasWidth) * initialRealRange;
          const expectedImagDelta = -(deltaY / canvasHeight) * initialImagRange;
          
          // Perform pan operation
          viewport.pan(deltaX, deltaY, canvasWidth, canvasHeight);
          
          // Get bounds after pan
          const afterBounds = viewport.getBounds();
          
          // Calculate actual complex plane deltas
          const actualRealDelta = beforeBounds.minReal - afterBounds.minReal;
          const actualImagDelta = beforeBounds.minImag - afterBounds.minImag;
          
          // Verify that the viewport translated proportionally to the pixel delta
          // The complex plane delta should equal (pixelDelta / canvasSize) * viewportRange
          // Note: Due to aspect ratio enforcement, there may be small adjustments
          expect(actualRealDelta).toBeCloseTo(expectedRealDelta, 8);
          expect(actualImagDelta).toBeCloseTo(expectedImagDelta, 8);
          
          // Verify that real range remains unchanged (translation preserves size)
          const afterRealRange = afterBounds.maxReal - afterBounds.minReal;
          expect(afterRealRange).toBeCloseTo(initialRealRange, 8);
          
          // Verify that both min and max moved by the same amount for real axis
          const minRealDelta = beforeBounds.minReal - afterBounds.minReal;
          const maxRealDelta = beforeBounds.maxReal - afterBounds.maxReal;
          expect(minRealDelta).toBeCloseTo(maxRealDelta, 8);
          
          // Verify aspect ratio is maintained
          const afterImagRange = afterBounds.maxImag - afterBounds.minImag;
          const afterAspectRatio = afterRealRange / afterImagRange;
          const expectedAspectRatio = canvasWidth / canvasHeight;
          expect(afterAspectRatio).toBeCloseTo(expectedAspectRatio, 8);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 6: Zoom direction affects viewport size correctly
  test('Property 6: Zoom direction affects viewport size correctly', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // canvasWidth
        fc.integer({ min: 100, max: 2000 }),  // canvasHeight
        // Generate random focal point coordinates
        fc.integer({ min: 0, max: 2000 }),  // focalX
        fc.integer({ min: 0, max: 2000 }),  // focalY
        // Generate random zoom factor
        fc.double({ min: 0.1, max: 10.0, noNaN: true }),  // zoomFactor
        (initialBounds, canvasWidth, canvasHeight, focalX, focalY, zoomFactor) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Skip zoom factor of exactly 1.0 (no change)
          if (Math.abs(zoomFactor - 1.0) < 0.01) {
            return true;
          }
          
          // Ensure focal point is within canvas bounds
          const clampedFocalX = Math.min(focalX, canvasWidth);
          const clampedFocalY = Math.min(focalY, canvasHeight);
          
          // Create viewport with initial bounds and enforce aspect ratio
          const viewport = new ViewportManager(initialBounds, canvasWidth, canvasHeight);
          
          // Get initial bounds (after aspect ratio enforcement)
          const beforeBounds = viewport.getBounds();
          const initialRealRange = beforeBounds.maxReal - beforeBounds.minReal;
          const initialImagRange = beforeBounds.maxImag - beforeBounds.minImag;
          
          // Perform zoom operation
          viewport.zoom(zoomFactor, clampedFocalX, clampedFocalY, canvasWidth, canvasHeight);
          
          // Get bounds after zoom
          const afterBounds = viewport.getBounds();
          const afterRealRange = afterBounds.maxReal - afterBounds.minReal;
          const afterImagRange = afterBounds.maxImag - afterBounds.minImag;
          
          // Verify zoom direction affects viewport size correctly
          if (zoomFactor > 1.0) {
            // Zoom in: viewport size should decrease
            expect(afterRealRange).toBeLessThan(initialRealRange);
            expect(afterImagRange).toBeLessThan(initialImagRange);
          } else {
            // Zoom out: viewport size should increase
            expect(afterRealRange).toBeGreaterThan(initialRealRange);
            expect(afterImagRange).toBeGreaterThan(initialImagRange);
          }
          
          // Verify the relationship between zoom factor and viewport size
          // newRange ≈ oldRange / zoomFactor (with aspect ratio adjustment)
          const expectedRealRange = initialRealRange / zoomFactor;
          
          // The real range should match the expected value closely
          expect(afterRealRange).toBeCloseTo(expectedRealRange, 8);
          
          // Verify aspect ratio is maintained
          const afterAspectRatio = afterRealRange / afterImagRange;
          const expectedAspectRatio = canvasWidth / canvasHeight;
          expect(afterAspectRatio).toBeCloseTo(expectedAspectRatio, 8);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 7: Zoom preserves focal point
  test('Property 7: Zoom preserves focal point', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // canvasWidth
        fc.integer({ min: 100, max: 2000 }),  // canvasHeight
        // Generate random focal point coordinates
        fc.integer({ min: 0, max: 2000 }),  // focalX
        fc.integer({ min: 0, max: 2000 }),  // focalY
        // Generate random zoom factor
        fc.double({ min: 0.1, max: 10.0, noNaN: true }),  // zoomFactor
        (initialBounds, canvasWidth, canvasHeight, focalX, focalY, zoomFactor) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Skip zoom factor of exactly 1.0 (no change)
          if (Math.abs(zoomFactor - 1.0) < 0.01) {
            return true;
          }
          
          // Ensure focal point is within canvas bounds
          const clampedFocalX = Math.min(focalX, canvasWidth);
          const clampedFocalY = Math.min(focalY, canvasHeight);
          
          // Create viewport with initial bounds and enforce aspect ratio
          const viewport = new ViewportManager(initialBounds, canvasWidth, canvasHeight);
          
          // Convert focal point to complex plane coordinates BEFORE zoom
          const focalPointBefore = viewport.canvasToComplex(
            clampedFocalX, 
            clampedFocalY, 
            canvasWidth, 
            canvasHeight
          );
          
          // Perform zoom operation
          viewport.zoom(zoomFactor, clampedFocalX, clampedFocalY, canvasWidth, canvasHeight);
          
          // Convert the same canvas coordinates to complex plane coordinates AFTER zoom
          const focalPointAfter = viewport.canvasToComplex(
            clampedFocalX, 
            clampedFocalY, 
            canvasWidth, 
            canvasHeight
          );
          
          // Verify that the focal point in complex plane coordinates remains unchanged
          // The same canvas pixel should map to the same complex plane coordinate
          // Note: With aspect ratio enforcement, there may be small adjustments
          expect(focalPointAfter.real).toBeCloseTo(focalPointBefore.real, 8);
          expect(focalPointAfter.imag).toBeCloseTo(focalPointBefore.imag, 8);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 8: Zoom preserves aspect ratio
  test('Property 8: Zoom preserves aspect ratio', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // canvasWidth
        fc.integer({ min: 100, max: 2000 }),  // canvasHeight
        // Generate random focal point coordinates
        fc.integer({ min: 0, max: 2000 }),  // focalX
        fc.integer({ min: 0, max: 2000 }),  // focalY
        // Generate random zoom factor
        fc.double({ min: 0.1, max: 10.0, noNaN: true }),  // zoomFactor
        (initialBounds, canvasWidth, canvasHeight, focalX, focalY, zoomFactor) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions that cause numerical instability
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Skip zoom factor of exactly 1.0 (no change)
          if (Math.abs(zoomFactor - 1.0) < 0.01) {
            return true;
          }
          
          // Ensure focal point is within canvas bounds
          const clampedFocalX = Math.min(focalX, canvasWidth);
          const clampedFocalY = Math.min(focalY, canvasHeight);
          
          // Create viewport with initial bounds and enforce aspect ratio
          const viewport = new ViewportManager(initialBounds, canvasWidth, canvasHeight);
          
          // Get initial bounds and calculate aspect ratio (after enforcement)
          const beforeBounds = viewport.getBounds();
          const initialRealRange = beforeBounds.maxReal - beforeBounds.minReal;
          const initialImagRange = beforeBounds.maxImag - beforeBounds.minImag;
          const initialAspectRatio = initialRealRange / initialImagRange;
          
          // Perform zoom operation
          viewport.zoom(zoomFactor, clampedFocalX, clampedFocalY, canvasWidth, canvasHeight);
          
          // Get bounds after zoom and calculate new aspect ratio
          const afterBounds = viewport.getBounds();
          const afterRealRange = afterBounds.maxReal - afterBounds.minReal;
          const afterImagRange = afterBounds.maxImag - afterBounds.minImag;
          const afterAspectRatio = afterRealRange / afterImagRange;
          
          // Verify that the aspect ratio matches the canvas aspect ratio
          // With 1:1 aspect ratio enforcement, the viewport should match canvas dimensions
          const expectedAspectRatio = canvasWidth / canvasHeight;
          expect(afterAspectRatio).toBeCloseTo(expectedAspectRatio, 8);
          
          // Also verify it's preserved from before (since both should match canvas)
          expect(afterAspectRatio).toBeCloseTo(initialAspectRatio, 8);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 13: 1:1 aspect ratio maintained
  test('Property 13: 1:1 aspect ratio maintained', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // canvasWidth
        fc.integer({ min: 100, max: 2000 }),  // canvasHeight
        // Generate random operation type: 'init', 'pan', 'zoom', 'resize'
        fc.constantFrom('init', 'pan', 'zoom', 'resize'),
        // Generate random parameters for operations
        fc.integer({ min: -500, max: 500 }),  // deltaX for pan
        fc.integer({ min: -500, max: 500 }),  // deltaY for pan
        fc.double({ min: 0.1, max: 10.0, noNaN: true }),  // zoomFactor
        fc.integer({ min: 0, max: 2000 }),  // focalX for zoom
        fc.integer({ min: 0, max: 2000 }),  // focalY for zoom
        fc.integer({ min: 100, max: 2000 }),  // newCanvasWidth for resize
        fc.integer({ min: 100, max: 2000 }),  // newCanvasHeight for resize
        (initialBounds, canvasWidth, canvasHeight, operation, deltaX, deltaY, zoomFactor, focalX, focalY, newCanvasWidth, newCanvasHeight) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Calculate expected canvas aspect ratio
          const canvasAspectRatio = canvasWidth / canvasHeight;
          
          // Create viewport and perform operation
          let viewport;
          let finalCanvasWidth = canvasWidth;
          let finalCanvasHeight = canvasHeight;
          
          if (operation === 'init') {
            // Test initialization with canvas dimensions
            viewport = new ViewportManager(initialBounds, canvasWidth, canvasHeight);
          } else {
            // Create viewport without enforcing aspect ratio initially
            viewport = new ViewportManager(initialBounds);
            
            if (operation === 'pan') {
              viewport.pan(deltaX, deltaY, canvasWidth, canvasHeight);
            } else if (operation === 'zoom') {
              // Skip zoom factor of exactly 1.0
              if (Math.abs(zoomFactor - 1.0) < 0.01) {
                return true;
              }
              const clampedFocalX = Math.min(focalX, canvasWidth);
              const clampedFocalY = Math.min(focalY, canvasHeight);
              viewport.zoom(zoomFactor, clampedFocalX, clampedFocalY, canvasWidth, canvasHeight);
            } else if (operation === 'resize') {
              viewport.resize(newCanvasWidth, newCanvasHeight);
              finalCanvasWidth = newCanvasWidth;
              finalCanvasHeight = newCanvasHeight;
            }
          }
          
          // Get final bounds
          const bounds = viewport.getBounds();
          const finalRealRange = bounds.maxReal - bounds.minReal;
          const finalImagRange = bounds.maxImag - bounds.minImag;
          
          // Calculate viewport aspect ratio
          const viewportAspectRatio = finalRealRange / finalImagRange;
          
          // Calculate expected aspect ratio based on final canvas dimensions
          const expectedAspectRatio = finalCanvasWidth / finalCanvasHeight;
          
          // Verify that viewport aspect ratio matches canvas aspect ratio
          // This ensures (maxReal - minReal) / (maxImag - minImag) = canvasWidth / canvasHeight
          expect(viewportAspectRatio).toBeCloseTo(expectedAspectRatio, 8);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 12: Viewport anchored at top-left on resize
  test('Property 12: Viewport anchored at top-left on resize', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        // Generate random initial canvas dimensions
        fc.integer({ min: 100, max: 2000 }),  // initialCanvasWidth
        fc.integer({ min: 100, max: 2000 }),  // initialCanvasHeight
        // Generate random new canvas dimensions (after resize)
        fc.integer({ min: 100, max: 2000 }),  // newCanvasWidth
        fc.integer({ min: 100, max: 2000 }),  // newCanvasHeight
        (initialBounds, initialCanvasWidth, initialCanvasHeight, newCanvasWidth, newCanvasHeight) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Skip viewports with extremely small dimensions
          const realRange = initialBounds.maxReal - initialBounds.minReal;
          const imagRange = initialBounds.maxImag - initialBounds.minImag;
          if (realRange < 1e-6 || imagRange < 1e-6) {
            return true;
          }
          
          // Skip if canvas dimensions don't change (no resize)
          if (initialCanvasWidth === newCanvasWidth && initialCanvasHeight === newCanvasHeight) {
            return true;
          }
          
          // Create viewport with initial canvas dimensions
          const viewport = new ViewportManager(initialBounds, initialCanvasWidth, initialCanvasHeight);
          
          // Get bounds after initial setup (with aspect ratio enforcement)
          const beforeBounds = viewport.getBounds();
          
          // Store the top-left corner position (minReal, maxImag)
          // In the complex plane, top-left is (minReal, maxImag)
          const topLeftReal = beforeBounds.minReal;
          const topLeftImag = beforeBounds.maxImag;
          
          // Perform resize operation
          viewport.resize(newCanvasWidth, newCanvasHeight);
          
          // Get bounds after resize
          const afterBounds = viewport.getBounds();
          
          // Verify that the top-left corner position remains unchanged
          // minReal should stay the same (left edge anchored)
          expect(afterBounds.minReal).toBeCloseTo(topLeftReal, 8);
          
          // maxImag should stay the same (top edge anchored)
          expect(afterBounds.maxImag).toBeCloseTo(topLeftImag, 8);
          
          // Verify that width changes affect the right edge only
          // If canvas width increased, maxReal should increase
          // If canvas width decreased, maxReal should decrease
          const beforeRealRange = beforeBounds.maxReal - beforeBounds.minReal;
          const afterRealRange = afterBounds.maxReal - afterBounds.minReal;
          
          // Calculate the X scale before resize
          const beforeScaleX = beforeRealRange / initialCanvasWidth;
          
          // The real range should maintain X scale
          const expectedRealRange = beforeScaleX * newCanvasWidth;
          expect(afterRealRange).toBeCloseTo(expectedRealRange, 6);
          
          // Verify that height changes affect the bottom edge only
          // If canvas height increased, minImag should decrease (bottom edge moves down)
          // If canvas height decreased, minImag should increase (bottom edge moves up)
          const beforeImagRange = beforeBounds.maxImag - beforeBounds.minImag;
          const afterImagRange = afterBounds.maxImag - afterBounds.minImag;
          
          // The imaginary range should be calculated to maintain aspect ratio
          const expectedImagRange = expectedRealRange * (newCanvasHeight / newCanvasWidth);
          expect(afterImagRange).toBeCloseTo(expectedImagRange, 6);
          
          // Verify aspect ratio is maintained
          const afterAspectRatio = afterRealRange / afterImagRange;
          const expectedAspectRatio = newCanvasWidth / newCanvasHeight;
          expect(afterAspectRatio).toBeCloseTo(expectedAspectRatio, 8);
        }
      ),
      { numRuns: 100 }
    );
  });
});
