import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CanvasResizeHandler } from '../../src/canvasResizeHandler.js';
import { createCanvas } from 'canvas';

describe('CanvasResizeHandler - Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 1: Canvas dimensions match viewport on resize
  test('Property 1: Canvas dimensions match viewport on resize', () => {
    fc.assert(
      fc.property(
        // Generate random initial viewport dimensions
        fc.integer({ min: 100, max: 3840 }),  // initialWidth
        fc.integer({ min: 100, max: 2160 }),  // initialHeight
        // Generate random new viewport dimensions (after resize)
        fc.integer({ min: 100, max: 3840 }),  // newWidth
        fc.integer({ min: 100, max: 2160 }),  // newHeight
        (initialWidth, initialHeight, newWidth, newHeight) => {
          // Create a canvas
          const canvas = createCanvas(800, 600);
          
          // Create a mock render engine
          const mockRenderEngine = {
            render: vi.fn()
          };
          
          // Mock window with initial dimensions
          global.window = {
            innerWidth: initialWidth,
            innerHeight: initialHeight,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          };
          
          // Create resize handler (this will set canvas to initial dimensions)
          const resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
          
          // Verify canvas matches initial viewport dimensions
          expect(canvas.width).toBe(initialWidth);
          expect(canvas.height).toBe(initialHeight);
          
          // Simulate window resize by changing window dimensions
          window.innerWidth = newWidth;
          window.innerHeight = newHeight;
          
          // Trigger resize handler
          resizeHandler.onResize();
          
          // Verify canvas dimensions match new viewport dimensions
          expect(canvas.width).toBe(newWidth);
          expect(canvas.height).toBe(newHeight);
          
          // Verify dimensions are accessible via getCanvasDimensions
          const dimensions = resizeHandler.getCanvasDimensions();
          expect(dimensions.width).toBe(newWidth);
          expect(dimensions.height).toBe(newHeight);
        }
      ),
      { numRuns: 100 }
    );
  });
});
