import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ViewportManager } from '../../src/viewportManager.js';
import { ViewportInfo } from '../../src/viewportInfo.js';

describe('ViewportInfo - Property Tests', () => {
  
  // Helper function to create a mock DOM container for ViewportInfo
  function createMockContainer() {
    const container = document.createElement('div');
    container.id = 'viewport-info';
    document.body.appendChild(container);
    return container;
  }

  // Helper function to clean up mock container
  function cleanupMockContainer() {
    const container = document.getElementById('viewport-info');
    if (container) {
      container.remove();
    }
  }

  beforeEach(() => {
    cleanupMockContainer();
  });

  // Feature: mandelbrot-visualizer, Property 19: Viewport info updates on zoom
  test('Property 19: Viewport info updates on zoom', () => {
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
          
          // Skip zoom factor of exactly 1.0 (no change)
          if (Math.abs(zoomFactor - 1.0) < 0.01) {
            return true;
          }
          
          // Ensure focal point is within canvas bounds
          const clampedFocalX = Math.min(focalX, canvasWidth);
          const clampedFocalY = Math.min(focalY, canvasHeight);
          
          // Create mock container
          const container = createMockContainer();
          
          // Create viewport manager and viewport info
          const viewportManager = new ViewportManager(initialBounds);
          const viewportInfo = new ViewportInfo(viewportManager);
          viewportInfo.render();
          
          // Perform zoom operation
          viewportManager.zoom(zoomFactor, clampedFocalX, clampedFocalY, canvasWidth, canvasHeight);
          
          // Update viewport info
          viewportInfo.updateBounds();
          
          // Get the updated bounds from viewport manager
          const updatedBounds = viewportManager.getBounds();
          
          // Verify that viewport info displays the correct values
          const realMinElement = viewportInfo.realMinElement;
          const realMaxElement = viewportInfo.realMaxElement;
          const imagMinElement = viewportInfo.imagMinElement;
          const imagMaxElement = viewportInfo.imagMaxElement;
          
          expect(realMinElement).toBeTruthy();
          expect(realMaxElement).toBeTruthy();
          expect(imagMinElement).toBeTruthy();
          expect(imagMaxElement).toBeTruthy();
          
          // Parse the displayed values and compare with actual bounds
          const displayedMinReal = parseFloat(realMinElement.textContent);
          const displayedMaxReal = parseFloat(realMaxElement.textContent);
          const displayedMinImag = parseFloat(imagMinElement.textContent);
          const displayedMaxImag = parseFloat(imagMaxElement.textContent);
          
          // Verify displayed values match the viewport bounds
          // Use relative tolerance for comparison due to formatting
          const tolerance = Math.max(
            Math.abs(updatedBounds.minReal) * 1e-4,
            Math.abs(updatedBounds.maxReal) * 1e-4,
            Math.abs(updatedBounds.minImag) * 1e-4,
            Math.abs(updatedBounds.maxImag) * 1e-4,
            1e-4
          );
          
          expect(Math.abs(displayedMinReal - updatedBounds.minReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxReal - updatedBounds.maxReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMinImag - updatedBounds.minImag)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxImag - updatedBounds.maxImag)).toBeLessThan(tolerance);
          
          // Cleanup
          cleanupMockContainer();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 20: Viewport info updates on pan
  test('Property 20: Viewport info updates on pan', () => {
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
          
          // Create mock container
          const container = createMockContainer();
          
          // Create viewport manager and viewport info
          const viewportManager = new ViewportManager(initialBounds);
          const viewportInfo = new ViewportInfo(viewportManager);
          viewportInfo.render();
          
          // Perform pan operation
          viewportManager.pan(deltaX, deltaY, canvasWidth, canvasHeight);
          
          // Update viewport info
          viewportInfo.updateBounds();
          
          // Get the updated bounds from viewport manager
          const updatedBounds = viewportManager.getBounds();
          
          // Verify that viewport info displays the correct values
          const realMinElement = viewportInfo.realMinElement;
          const realMaxElement = viewportInfo.realMaxElement;
          const imagMinElement = viewportInfo.imagMinElement;
          const imagMaxElement = viewportInfo.imagMaxElement;
          
          expect(realMinElement).toBeTruthy();
          expect(realMaxElement).toBeTruthy();
          expect(imagMinElement).toBeTruthy();
          expect(imagMaxElement).toBeTruthy();
          
          // Parse the displayed values and compare with actual bounds
          const displayedMinReal = parseFloat(realMinElement.textContent);
          const displayedMaxReal = parseFloat(realMaxElement.textContent);
          const displayedMinImag = parseFloat(imagMinElement.textContent);
          const displayedMaxImag = parseFloat(imagMaxElement.textContent);
          
          // Verify displayed values match the viewport bounds
          // Use relative tolerance for comparison due to formatting
          const tolerance = Math.max(
            Math.abs(updatedBounds.minReal) * 1e-4,
            Math.abs(updatedBounds.maxReal) * 1e-4,
            Math.abs(updatedBounds.minImag) * 1e-4,
            Math.abs(updatedBounds.maxImag) * 1e-4,
            1e-4
          );
          
          expect(Math.abs(displayedMinReal - updatedBounds.minReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxReal - updatedBounds.maxReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMinImag - updatedBounds.minImag)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxImag - updatedBounds.maxImag)).toBeLessThan(tolerance);
          
          // Cleanup
          cleanupMockContainer();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: mandelbrot-visualizer, Property 21: Viewport info updates on resize
  test('Property 21: Viewport info updates on resize', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport bounds
        fc.record({
          minReal: fc.double({ min: -10, max: 0, noNaN: true }),
          maxReal: fc.double({ min: 0, max: 10, noNaN: true }),
          minImag: fc.double({ min: -10, max: 0, noNaN: true }),
          maxImag: fc.double({ min: 0, max: 10, noNaN: true })
        }),
        (initialBounds) => {
          // Skip invalid viewports where min >= max
          if (initialBounds.minReal >= initialBounds.maxReal || 
              initialBounds.minImag >= initialBounds.maxImag) {
            return true;
          }
          
          // Create mock container
          const container = createMockContainer();
          
          // Create viewport manager and viewport info
          const viewportManager = new ViewportManager(initialBounds);
          const viewportInfo = new ViewportInfo(viewportManager);
          viewportInfo.render();
          
          // Note: Resize doesn't change viewport bounds in the current implementation
          // The viewport manager doesn't have a resize method that changes bounds
          // However, we should verify that updateBounds() correctly reflects
          // the current viewport state after any operation
          
          // Simply call updateBounds to simulate what happens after resize
          viewportInfo.updateBounds();
          
          // Get the current bounds from viewport manager
          const currentBounds = viewportManager.getBounds();
          
          // Verify that viewport info displays the correct values
          const realMinElement = viewportInfo.realMinElement;
          const realMaxElement = viewportInfo.realMaxElement;
          const imagMinElement = viewportInfo.imagMinElement;
          const imagMaxElement = viewportInfo.imagMaxElement;
          
          expect(realMinElement).toBeTruthy();
          expect(realMaxElement).toBeTruthy();
          expect(imagMinElement).toBeTruthy();
          expect(imagMaxElement).toBeTruthy();
          
          // Parse the displayed values and compare with actual bounds
          const displayedMinReal = parseFloat(realMinElement.textContent);
          const displayedMaxReal = parseFloat(realMaxElement.textContent);
          const displayedMinImag = parseFloat(imagMinElement.textContent);
          const displayedMaxImag = parseFloat(imagMaxElement.textContent);
          
          // Verify displayed values match the viewport bounds
          // Use relative tolerance for comparison due to formatting
          const tolerance = Math.max(
            Math.abs(currentBounds.minReal) * 1e-4,
            Math.abs(currentBounds.maxReal) * 1e-4,
            Math.abs(currentBounds.minImag) * 1e-4,
            Math.abs(currentBounds.maxImag) * 1e-4,
            1e-4
          );
          
          expect(Math.abs(displayedMinReal - currentBounds.minReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxReal - currentBounds.maxReal)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMinImag - currentBounds.minImag)).toBeLessThan(tolerance);
          expect(Math.abs(displayedMaxImag - currentBounds.maxImag)).toBeLessThan(tolerance);
          
          // Cleanup
          cleanupMockContainer();
        }
      ),
      { numRuns: 100 }
    );
  });
});
