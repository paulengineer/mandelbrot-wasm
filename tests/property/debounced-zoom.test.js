import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EventHandler } from '../../src/eventHandler.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('EventHandler - Debounced Zoom Property Tests', () => {
  
  // Feature: mandelbrot-visualizer, Property 15: Debounced render after zoom
  test('Property 15: Debounced render after zoom', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of zoom events (1-10)
        fc.integer({ min: 1, max: 10 }),
        // Generate random delays between zoom events (0-500ms, less than debounce delay)
        fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 1, maxLength: 10 }),
        async (numZooms, delays) => {
          // Create mock canvas
          const realCanvas = createCanvas(800, 600);
          const canvas = {
            ...realCanvas,
            width: 800,
            height: 600,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          };
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          });
          
          // Create mock render engine with spy
          const mockRenderEngine = {
            render: vi.fn().mockReturnValue(100), // Mock render time
            scaleCanvas: vi.fn(), // Mock canvas scaling
            canvas: canvas
          };
          
          // Create event handler
          const eventHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
          
          // Clear any initial render calls
          mockRenderEngine.render.mockClear();
          
          // Perform sequence of zoom operations with delays
          for (let i = 0; i < numZooms; i++) {
            // Create wheel event
            const wheelEvent = new WheelEvent('wheel', {
              deltaY: -100
            });
            Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
            Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
            Object.defineProperty(wheelEvent, 'preventDefault', { 
              value: vi.fn(),
              writable: true 
            });
            
            // Trigger zoom
            eventHandler.onWheel(wheelEvent);
            
            // Wait for the delay before next zoom (if not last zoom)
            if (i < numZooms - 1 && delays[i] !== undefined) {
              await new Promise(resolve => setTimeout(resolve, delays[i]));
            }
          }
          
          // At this point, no render should have been called yet
          // (or very few if delays were long enough to trigger some debounces)
          const renderCallsBeforeDebounce = mockRenderEngine.render.mock.calls.length;
          
          // Wait for debounce delay to expire (1000ms + buffer)
          await new Promise(resolve => setTimeout(resolve, 1100));
          
          // After debounce delay, exactly one more render should have been called
          const renderCallsAfterDebounce = mockRenderEngine.render.mock.calls.length;
          const newRenderCalls = renderCallsAfterDebounce - renderCallsBeforeDebounce;
          
          // Verify that exactly one render was triggered after the debounce period
          expect(newRenderCalls).toBe(1);
          
          // Cleanup
          eventHandler.detachEventListeners();
        }
      ),
      { numRuns: 10 } // Reduced runs due to async delays
    );
  });

  test('Property 15 (variant): Pan cancels zoom debounce', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random delay after zoom before pan (0-900ms, less than debounce)
        fc.integer({ min: 0, max: 900 }),
        async (delayBeforePan) => {
          // Create mock canvas
          const realCanvas = createCanvas(800, 600);
          const canvas = {
            ...realCanvas,
            width: 800,
            height: 600,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          };
          
          // Create viewport manager
          const viewportManager = new ViewportManager({
            minReal: -2.0,
            maxReal: 1.0,
            minImag: -1.0,
            maxImag: 1.0
          });
          
          // Create mock render engine with spy
          const mockRenderEngine = {
            render: vi.fn().mockReturnValue(100),
            scaleCanvas: vi.fn(), // Mock canvas scaling
            canvas: canvas
          };
          
          // Create event handler
          const eventHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
          
          // Clear any initial render calls
          mockRenderEngine.render.mockClear();
          
          // Perform zoom operation
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: -100
          });
          Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
          Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
          Object.defineProperty(wheelEvent, 'preventDefault', { 
            value: vi.fn(),
            writable: true 
          });
          
          eventHandler.onWheel(wheelEvent);
          
          // Wait for delay before pan
          await new Promise(resolve => setTimeout(resolve, delayBeforePan));
          
          // Start pan operation (should cancel zoom debounce)
          const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            clientX: 400,
            clientY: 300
          });
          Object.defineProperty(mouseDownEvent, 'preventDefault', { 
            value: vi.fn(),
            writable: true 
          });
          
          eventHandler.onMouseDown(mouseDownEvent);
          
          // Record render calls before waiting for debounce
          const renderCallsBeforeWait = mockRenderEngine.render.mock.calls.length;
          
          // Wait for what would have been the debounce delay
          await new Promise(resolve => setTimeout(resolve, 1100));
          
          // The zoom debounce should have been cancelled by the pan
          // So no additional render from zoom debounce should occur
          const renderCallsAfterWait = mockRenderEngine.render.mock.calls.length;
          const newRenderCalls = renderCallsAfterWait - renderCallsBeforeWait;
          
          // No render from zoom debounce should have occurred
          // (there might be renders from pan, but not from zoom debounce)
          expect(newRenderCalls).toBe(0);
          
          // Cleanup
          eventHandler.detachEventListeners();
        }
      ),
      { numRuns: 10 } // Reduced runs due to async delays
    );
  });

  test('Property 15 (variant): Multiple zooms reset debounce timer', async () => {
    // This test verifies that each zoom resets the timer
    // So if we zoom every 500ms for 3 times, the render should only happen
    // 1000ms after the LAST zoom
    
    // Create mock canvas
    const realCanvas = createCanvas(800, 600);
    const canvas = {
      ...realCanvas,
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    
    // Create viewport manager
    const viewportManager = new ViewportManager({
      minReal: -2.0,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });
    
    // Create mock render engine with spy
    const mockRenderEngine = {
      render: vi.fn().mockReturnValue(100),
      scaleCanvas: vi.fn(), // Mock canvas scaling
      canvas: canvas
    };
    
    // Create event handler
    const eventHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
    
    // Clear any initial render calls
    mockRenderEngine.render.mockClear();
    
    // Perform 3 zoom operations, each 500ms apart
    for (let i = 0; i < 3; i++) {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
      Object.defineProperty(wheelEvent, 'preventDefault', { 
        value: vi.fn(),
        writable: true 
      });
      
      eventHandler.onWheel(wheelEvent);
      
      // Wait 500ms before next zoom
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // At this point, 1000ms have passed since the first zoom
    // But only 0ms since the last zoom
    // So no render should have occurred yet
    expect(mockRenderEngine.render).not.toHaveBeenCalled();
    
    // Wait 600ms (total 1100ms since last zoom)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Now exactly one render should have been called
    expect(mockRenderEngine.render).toHaveBeenCalledTimes(1);
    
    // Cleanup
    eventHandler.detachEventListeners();
  });
});
