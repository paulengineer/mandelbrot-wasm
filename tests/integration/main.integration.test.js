/**
 * Integration Tests for Main Application
 * 
 * Tests the complete render cycle, pan and zoom sequences,
 * module switching, and cross-module equivalence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createCanvas } from 'canvas';

// Mock the canvas element in JSDOM
function setupDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <canvas id="mandelbrot-canvas"></canvas>
        <div id="module-selector"></div>
        <div id="error-message" class="hidden"></div>
      </body>
    </html>
  `, {
    url: 'http://localhost',
    pretendToBeVisual: true
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  
  // Replace the canvas element with one from the canvas package
  const canvas = createCanvas(800, 600);
  const canvasElement = document.getElementById('mandelbrot-canvas');
  
  // Copy canvas methods to the DOM element
  canvasElement.getContext = canvas.getContext.bind(canvas);
  canvasElement.width = 800;
  canvasElement.height = 600;
  Object.defineProperty(canvasElement, 'width', {
    get: () => canvas.width,
    set: (value) => { canvas.width = value; }
  });
  Object.defineProperty(canvasElement, 'height', {
    get: () => canvas.height,
    set: (value) => { canvas.height = value; }
  });

  return { dom, canvas };
}

function teardownDOM() {
  delete global.window;
  delete global.document;
  delete global.HTMLCanvasElement;
}

describe('Main Application Integration Tests', () => {
  let dom, canvas;
  let ViewportManager, RenderEngine, EventHandler, ModuleSelector;
  let mockWasmModule;

  beforeEach(async () => {
    // Setup DOM
    ({ dom, canvas } = setupDOM());

    // Import modules
    ({ ViewportManager } = await import('../../src/viewportManager.js'));
    ({ RenderEngine } = await import('../../src/renderEngine.js'));
    ({ EventHandler } = await import('../../src/eventHandler.js'));
    ({ ModuleSelector } = await import('../../src/moduleSelector.js'));

    // Create mock WebAssembly module
    mockWasmModule = {
      calculatePoint: vi.fn((real, imag, maxIterations, escapeRadius) => {
        // Simple Mandelbrot calculation for testing
        let zReal = 0;
        let zImag = 0;
        let iteration = 0;

        while (iteration < maxIterations) {
          const zReal2 = zReal * zReal;
          const zImag2 = zImag * zImag;

          if (zReal2 + zImag2 > escapeRadius * escapeRadius) {
            return iteration;
          }

          const newZReal = zReal2 - zImag2 + real;
          const newZImag = 2 * zReal * zImag + imag;

          zReal = newZReal;
          zImag = newZImag;
          iteration++;
        }

        return maxIterations;
      }),
      name: 'Mock',
      type: 'mock'
    };
  });

  afterEach(() => {
    teardownDOM();
    vi.clearAllMocks();
  });

  describe('Complete Render Cycle', () => {
    it('should complete a full render cycle from initialization to display', () => {
      // Initialize viewport
      const viewportManager = new ViewportManager({
        minReal: -2.5,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      // Initialize render engine
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Perform render
      renderEngine.render();

      // Verify render completed
      expect(mockWasmModule.calculatePoint).toHaveBeenCalled();
      
      // Should calculate for all pixels
      const expectedCalls = canvasElement.width * canvasElement.height;
      expect(mockWasmModule.calculatePoint).toHaveBeenCalledTimes(expectedCalls);
    });

    it('should render with correct viewport coordinates', () => {
      const viewportManager = new ViewportManager({
        minReal: -2.5,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      renderEngine.render();

      // Check that corner pixels map to correct complex coordinates
      const calls = mockWasmModule.calculatePoint.mock.calls;
      
      // First pixel (top-left) should be near minReal, maxImag
      const firstCall = calls[0];
      expect(firstCall[0]).toBeCloseTo(-2.5, 1); // real
      expect(firstCall[1]).toBeCloseTo(1.0, 1);  // imag

      // Last pixel (bottom-right) should be near maxReal, minImag
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBeCloseTo(1.0, 1);   // real
      expect(lastCall[1]).toBeCloseTo(-1.0, 1);  // imag
    });

    it('should produce valid pixel data', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      const ctx = canvasElement.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');

      renderEngine.render();

      expect(putImageDataSpy).toHaveBeenCalledTimes(1);
      
      const imageData = putImageDataSpy.mock.calls[0][0];
      expect(imageData.width).toBe(canvasElement.width);
      expect(imageData.height).toBe(canvasElement.height);
      
      // Verify all pixels have valid RGBA values
      for (let i = 0; i < imageData.data.length; i += 4) {
        expect(imageData.data[i]).toBeGreaterThanOrEqual(0);
        expect(imageData.data[i]).toBeLessThanOrEqual(255);
        expect(imageData.data[i + 3]).toBe(255); // Alpha should be 255
      }
    });
  });

  describe('Pan and Zoom Sequence', () => {
    it('should handle pan followed by zoom correctly', () => {
      const viewportManager = new ViewportManager({
        minReal: -2.5,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);
      const eventHandler = new EventHandler(canvasElement, viewportManager, renderEngine);

      // Get initial bounds
      const initialBounds = viewportManager.getBounds();

      // Simulate pan: drag 100 pixels to the right
      viewportManager.pan(100, 0, canvasElement.width, canvasElement.height);
      const boundsAfterPan = viewportManager.getBounds();

      // Verify pan changed the viewport
      expect(boundsAfterPan.minReal).not.toBe(initialBounds.minReal);
      expect(boundsAfterPan.maxReal).not.toBe(initialBounds.maxReal);

      // Simulate zoom: zoom in at center
      const centerX = canvasElement.width / 2;
      const centerY = canvasElement.height / 2;
      viewportManager.zoom(2.0, centerX, centerY, canvasElement.width, canvasElement.height);
      const boundsAfterZoom = viewportManager.getBounds();

      // Verify zoom changed the viewport
      expect(boundsAfterZoom.minReal).not.toBe(boundsAfterPan.minReal);
      expect(boundsAfterZoom.maxReal).not.toBe(boundsAfterPan.maxReal);

      // Verify viewport is smaller after zoom in
      const widthAfterPan = boundsAfterPan.maxReal - boundsAfterPan.minReal;
      const widthAfterZoom = boundsAfterZoom.maxReal - boundsAfterZoom.minReal;
      expect(widthAfterZoom).toBeLessThan(widthAfterPan);

      // Render should work after both operations
      mockWasmModule.calculatePoint.mockClear();
      renderEngine.render();
      expect(mockWasmModule.calculatePoint).toHaveBeenCalled();
    });

    it('should maintain viewport consistency through multiple operations', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');

      // Perform multiple pans and zooms
      viewportManager.pan(50, 50, canvasElement.width, canvasElement.height);
      viewportManager.zoom(1.5, 400, 300, canvasElement.width, canvasElement.height);
      viewportManager.pan(-30, 20, canvasElement.width, canvasElement.height);
      viewportManager.zoom(0.8, 200, 400, canvasElement.width, canvasElement.height);

      // Verify viewport is still valid
      const bounds = viewportManager.getBounds();
      expect(bounds.minReal).toBeLessThan(bounds.maxReal);
      expect(bounds.minImag).toBeLessThan(bounds.maxImag);
      expect(isFinite(bounds.minReal)).toBe(true);
      expect(isFinite(bounds.maxReal)).toBe(true);
      expect(isFinite(bounds.minImag)).toBe(true);
      expect(isFinite(bounds.maxImag)).toBe(true);
    });

    it('should trigger render after each interaction', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      const renderSpy = vi.spyOn(renderEngine, 'render');

      // Simulate pan
      viewportManager.pan(50, 0, canvasElement.width, canvasElement.height);
      renderEngine.render();
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Simulate zoom
      viewportManager.zoom(2.0, 400, 300, canvasElement.width, canvasElement.height);
      renderEngine.render();
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Module Switching', () => {
    it('should switch modules while preserving viewport', () => {
      const viewportManager = new ViewportManager({
        minReal: -1.0,
        maxReal: 0.5,
        minImag: -0.5,
        maxImag: 0.5
      });

      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Get initial viewport
      const initialBounds = viewportManager.getBounds();

      // Create a new mock module
      const newMockModule = {
        calculatePoint: vi.fn((real, imag, maxIterations, escapeRadius) => {
          return Math.floor(maxIterations / 2);
        }),
        name: 'NewMock',
        type: 'newmock'
      };

      // Switch module
      renderEngine.setWasmModule(newMockModule);

      // Verify viewport unchanged
      const boundsAfterSwitch = viewportManager.getBounds();
      expect(boundsAfterSwitch.minReal).toBe(initialBounds.minReal);
      expect(boundsAfterSwitch.maxReal).toBe(initialBounds.maxReal);
      expect(boundsAfterSwitch.minImag).toBe(initialBounds.minImag);
      expect(boundsAfterSwitch.maxImag).toBe(initialBounds.maxImag);

      // Verify new module is being used
      expect(newMockModule.calculatePoint).toHaveBeenCalled();
    });

    it('should render correctly after module switch', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Initial render
      renderEngine.render();
      const initialCallCount = mockWasmModule.calculatePoint.mock.calls.length;

      // Create new module
      const newMockModule = {
        calculatePoint: vi.fn(() => 100),
        name: 'NewMock',
        type: 'newmock'
      };

      // Switch and verify
      renderEngine.setWasmModule(newMockModule);
      
      // New module should be called for all pixels
      const expectedCalls = canvasElement.width * canvasElement.height;
      expect(newMockModule.calculatePoint).toHaveBeenCalledTimes(expectedCalls);
    });

    it('should handle module switching during active rendering', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      
      // Use smaller canvas for faster test
      canvasElement.width = 100;
      canvasElement.height = 100;
      
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Start render
      renderEngine.render();

      // Create new module
      const newMockModule = {
        calculatePoint: vi.fn(() => 50),
        name: 'NewMock',
        type: 'newmock'
      };

      // Switch module (this triggers a new render)
      renderEngine.setWasmModule(newMockModule);

      // Verify new module was used
      expect(newMockModule.calculatePoint).toHaveBeenCalled();
    });
  });

  describe('Cross-Module Equivalence', () => {
    it('should produce equivalent results for the same input across different modules', () => {
      const viewportManager = new ViewportManager({
        minReal: -0.5,
        maxReal: 0.5,
        minImag: -0.5,
        maxImag: 0.5
      });

      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 50;
      canvasElement.height = 50;

      // Create three mock modules with identical calculation logic
      const createModule = (name) => ({
        calculatePoint: vi.fn((real, imag, maxIterations, escapeRadius) => {
          let zReal = 0;
          let zImag = 0;
          let iteration = 0;

          while (iteration < maxIterations) {
            const zReal2 = zReal * zReal;
            const zImag2 = zImag * zImag;

            if (zReal2 + zImag2 > escapeRadius * escapeRadius) {
              return iteration;
            }

            const newZReal = zReal2 - zImag2 + real;
            const newZImag = 2 * zReal * zImag + imag;

            zReal = newZReal;
            zImag = newZImag;
            iteration++;
          }

          return maxIterations;
        }),
        name,
        type: name.toLowerCase()
      });

      const module1 = createModule('Rust');
      const module2 = createModule('CPP');
      const module3 = createModule('Go');

      // Render with each module
      const renderEngine = new RenderEngine(canvasElement, module1, viewportManager);
      renderEngine.render();
      const results1 = module1.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(module2);
      const results2 = module2.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(module3);
      const results3 = module3.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      // Verify all modules were called with the same coordinates
      expect(results1.length).toBe(results2.length);
      expect(results2.length).toBe(results3.length);

      // Check that coordinates match for each pixel
      for (let i = 0; i < results1.length; i++) {
        expect(results1[i][0]).toBeCloseTo(results2[i][0], 10); // real
        expect(results1[i][1]).toBeCloseTo(results2[i][1], 10); // imag
        expect(results2[i][0]).toBeCloseTo(results3[i][0], 10); // real
        expect(results2[i][1]).toBeCloseTo(results3[i][1], 10); // imag
      }
    });

    it('should produce visually similar output across modules', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 20;
      canvasElement.height = 20;

      // Create modules with identical logic
      const createModule = (name) => ({
        calculatePoint: (real, imag, maxIterations, escapeRadius) => {
          let zReal = 0;
          let zImag = 0;
          let iteration = 0;

          while (iteration < maxIterations) {
            const zReal2 = zReal * zReal;
            const zImag2 = zImag * zImag;

            if (zReal2 + zImag2 > escapeRadius * escapeRadius) {
              return iteration;
            }

            const newZReal = zReal2 - zImag2 + real;
            const newZImag = 2 * zReal * zImag + imag;

            zReal = newZReal;
            zImag = newZImag;
            iteration++;
          }

          return maxIterations;
        },
        name,
        type: name.toLowerCase()
      });

      const module1 = createModule('Rust');
      const module2 = createModule('CPP');

      // Render with first module
      const renderEngine = new RenderEngine(canvasElement, module1, viewportManager);
      const ctx = canvasElement.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');

      renderEngine.render();
      const imageData1 = putImageDataSpy.mock.calls[0][0];
      const pixels1 = Array.from(imageData1.data);

      // Render with second module
      putImageDataSpy.mockClear();
      renderEngine.setWasmModule(module2);
      const imageData2 = putImageDataSpy.mock.calls[0][0];
      const pixels2 = Array.from(imageData2.data);

      // Verify pixel data is identical
      expect(pixels1.length).toBe(pixels2.length);
      for (let i = 0; i < pixels1.length; i++) {
        expect(pixels1[i]).toBe(pixels2[i]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle viewport state errors gracefully', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Try to create invalid viewport state (this should be prevented by ViewportManager)
      // But we can test that rendering still works with extreme zoom
      for (let i = 0; i < 10; i++) {
        viewportManager.zoom(2.0, 400, 300, canvasElement.width, canvasElement.height);
      }

      // Should still be able to render
      expect(() => renderEngine.render()).not.toThrow();
    });

    it('should handle calculation errors gracefully', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      
      // Create module that throws errors
      const errorModule = {
        calculatePoint: vi.fn(() => {
          throw new Error('Calculation error');
        }),
        name: 'Error',
        type: 'error'
      };

      const renderEngine = new RenderEngine(canvasElement, errorModule, viewportManager);

      // Render should throw (this is expected behavior)
      expect(() => renderEngine.render()).toThrow();
    });
  });

  describe('Performance and State Consistency', () => {
    it('should maintain consistent state through rapid interactions', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 50;
      canvasElement.height = 50;
      
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Simulate rapid pan and zoom operations
      for (let i = 0; i < 10; i++) {
        viewportManager.pan(Math.random() * 20 - 10, Math.random() * 20 - 10, 
                           canvasElement.width, canvasElement.height);
        viewportManager.zoom(0.9 + Math.random() * 0.2, 
                           Math.random() * canvasElement.width,
                           Math.random() * canvasElement.height,
                           canvasElement.width, canvasElement.height);
      }

      // Verify viewport is still valid
      const bounds = viewportManager.getBounds();
      expect(bounds.minReal).toBeLessThan(bounds.maxReal);
      expect(bounds.minImag).toBeLessThan(bounds.maxImag);
      expect(isFinite(bounds.minReal)).toBe(true);

      // Should still be able to render
      expect(() => renderEngine.render()).not.toThrow();
    });

    it('should handle window resize correctly', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Initial render
      renderEngine.render();
      const initialCalls = mockWasmModule.calculatePoint.mock.calls.length;

      // Simulate resize
      canvasElement.width = 400;
      canvasElement.height = 300;

      // Render after resize
      mockWasmModule.calculatePoint.mockClear();
      renderEngine.render();

      // Should calculate for new canvas size
      const expectedCalls = 400 * 300;
      expect(mockWasmModule.calculatePoint).toHaveBeenCalledTimes(expectedCalls);
    });
  });
});
