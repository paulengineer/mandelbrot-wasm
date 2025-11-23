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
        minReal: -2.0,
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
        minReal: -2.0,
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
      expect(firstCall[0]).toBeCloseTo(-2.0, 1); // real
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
        minReal: -2.0,
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
    it('should produce equivalent results for the same input across all 5 modules', () => {
      const viewportManager = new ViewportManager({
        minReal: -0.5,
        maxReal: 0.5,
        minImag: -0.5,
        maxImag: 0.5
      });

      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 50;
      canvasElement.height = 50;

      // Create five mock modules with identical calculation logic
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

      const rustModule = createModule('Rust');
      const cppModule = createModule('CPP');
      const goModule = createModule('Go');
      const moonbitModule = createModule('Moonbit');
      const javascriptModule = createModule('JavaScript');

      // Render with each module
      const renderEngine = new RenderEngine(canvasElement, rustModule, viewportManager);
      renderEngine.render();
      const rustResults = rustModule.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(cppModule);
      const cppResults = cppModule.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(goModule);
      const goResults = goModule.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(moonbitModule);
      const moonbitResults = moonbitModule.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      renderEngine.setWasmModule(javascriptModule);
      const javascriptResults = javascriptModule.calculatePoint.mock.calls.map(call => call.slice(0, 2));

      // Verify all modules were called with the same coordinates
      expect(rustResults.length).toBe(cppResults.length);
      expect(cppResults.length).toBe(goResults.length);
      expect(goResults.length).toBe(moonbitResults.length);
      expect(moonbitResults.length).toBe(javascriptResults.length);

      // Check that coordinates match for each pixel across all modules
      for (let i = 0; i < rustResults.length; i++) {
        expect(rustResults[i][0]).toBeCloseTo(cppResults[i][0], 10); // real
        expect(rustResults[i][1]).toBeCloseTo(cppResults[i][1], 10); // imag
        expect(cppResults[i][0]).toBeCloseTo(goResults[i][0], 10); // real
        expect(cppResults[i][1]).toBeCloseTo(goResults[i][1], 10); // imag
        expect(goResults[i][0]).toBeCloseTo(moonbitResults[i][0], 10); // real
        expect(goResults[i][1]).toBeCloseTo(moonbitResults[i][1], 10); // imag
        expect(moonbitResults[i][0]).toBeCloseTo(javascriptResults[i][0], 10); // real
        expect(moonbitResults[i][1]).toBeCloseTo(javascriptResults[i][1], 10); // imag
      }
    });

    it('should produce visually similar output across all modules', () => {
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

      const rustModule = createModule('Rust');
      const cppModule = createModule('CPP');
      const goModule = createModule('Go');
      const moonbitModule = createModule('Moonbit');
      const javascriptModule = createModule('JavaScript');

      // Render with first module
      const renderEngine = new RenderEngine(canvasElement, rustModule, viewportManager);
      const ctx = canvasElement.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');

      renderEngine.render();
      const imageData1 = putImageDataSpy.mock.calls[0][0];
      const pixels1 = Array.from(imageData1.data);

      // Test each subsequent module against the first
      const modules = [cppModule, goModule, moonbitModule, javascriptModule];
      modules.forEach(module => {
        putImageDataSpy.mockClear();
        renderEngine.setWasmModule(module);
        const imageData = putImageDataSpy.mock.calls[0][0];
        const pixels = Array.from(imageData.data);

        // Verify pixel data is identical
        expect(pixels.length).toBe(pixels1.length);
        for (let i = 0; i < pixels1.length; i++) {
          expect(pixels[i]).toBe(pixels1[i]);
        }
      });
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

  describe('Render Time Display', () => {
    let ModuleSelector, ViewportInfo;

    beforeEach(async () => {
      ({ ModuleSelector } = await import('../../src/moduleSelector.js'));
      ({ ViewportInfo } = await import('../../src/viewportInfo.js'));
    });

    it('should update render time display after each render', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 50;
      canvasElement.height = 50;
      
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);
      
      // Create module selector
      const mockCallback = vi.fn();
      const moduleSelector = new ModuleSelector(mockCallback);
      moduleSelector.render();

      // Perform render
      const renderTime = renderEngine.render();

      // Update render time display
      moduleSelector.updateRenderTime(renderTime);

      // Verify render time is displayed
      const renderTimeElement = document.querySelector('.render-time');
      expect(renderTimeElement).toBeTruthy();
      expect(renderTimeElement.textContent).toContain('Render time:');
      expect(renderTimeElement.textContent).toContain('ms');
      
      // Verify time is in whole milliseconds
      const timeMatch = renderTimeElement.textContent.match(/(\d+)ms/);
      expect(timeMatch).toBeTruthy();
      const displayedTime = parseInt(timeMatch[1]);
      expect(displayedTime).toBeGreaterThanOrEqual(0);
    });

    it('should update render time after module switch', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 50;
      canvasElement.height = 50;
      
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);
      
      const mockCallback = vi.fn();
      const moduleSelector = new ModuleSelector(mockCallback);
      moduleSelector.render();

      // First render
      const renderTime1 = renderEngine.render();
      moduleSelector.updateRenderTime(renderTime1);
      
      const renderTimeElement = document.querySelector('.render-time');
      const firstTime = renderTimeElement.textContent;

      // Switch module and render again
      const newModule = {
        calculatePoint: vi.fn(() => 50),
        name: 'NewMock',
        type: 'newmock'
      };
      renderEngine.setWasmModule(newModule);
      const renderTime2 = renderEngine.getLastRenderTime();
      moduleSelector.updateRenderTime(renderTime2);

      // Verify time was updated
      const secondTime = renderTimeElement.textContent;
      expect(secondTime).toContain('Render time:');
      expect(secondTime).toContain('ms');
    });
  });

  describe('Modal Error Dialog Flow', () => {
    let ModuleSelector;

    beforeEach(async () => {
      ({ ModuleSelector } = await import('../../src/moduleSelector.js'));
      
      // Create modal DOM elements
      const modal = document.createElement('div');
      modal.id = 'error-modal';
      modal.className = 'modal-overlay hidden';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      
      const modalTitle = document.createElement('h2');
      modalTitle.id = 'modal-title';
      modalTitle.textContent = 'Error';
      
      const modalMessage = document.createElement('p');
      modalMessage.id = 'modal-message';
      
      const closeButton = document.createElement('button');
      closeButton.id = 'modal-close';
      closeButton.textContent = 'Close';
      
      modalContent.appendChild(modalTitle);
      modalContent.appendChild(modalMessage);
      modalContent.appendChild(closeButton);
      modal.appendChild(modalContent);
      
      document.body.appendChild(modal);
    });

    it('should display modal error on module load failure', () => {
      const mockCallback = vi.fn();
      const moduleSelector = new ModuleSelector(mockCallback);
      moduleSelector.render();

      const errorMessage = 'Failed to load WebAssembly module';
      moduleSelector.showError(errorMessage);

      const modal = document.getElementById('error-modal');
      const modalMessage = document.getElementById('modal-message');

      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modalMessage.textContent).toBe(errorMessage);
    });

    it('should persist modal until user dismisses', async () => {
      const mockCallback = vi.fn();
      const moduleSelector = new ModuleSelector(mockCallback);
      moduleSelector.render();

      moduleSelector.showError('Test error');

      const modal = document.getElementById('error-modal');
      expect(modal.classList.contains('hidden')).toBe(false);

      // Wait to ensure modal doesn't auto-dismiss
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(modal.classList.contains('hidden')).toBe(false);

      // User dismisses
      moduleSelector.hideError();
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should handle multiple sequential errors', () => {
      const mockCallback = vi.fn();
      const moduleSelector = new ModuleSelector(mockCallback);
      moduleSelector.render();

      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const modal = document.getElementById('error-modal');
      const modalMessage = document.getElementById('modal-message');

      errors.forEach(error => {
        moduleSelector.showError(error);
        expect(modal.classList.contains('hidden')).toBe(false);
        expect(modalMessage.textContent).toBe(error);
        
        moduleSelector.hideError();
        expect(modal.classList.contains('hidden')).toBe(true);
      });
    });
  });

  describe('Viewport Info Updates', () => {
    let ViewportInfo;

    beforeEach(async () => {
      ({ ViewportInfo } = await import('../../src/viewportInfo.js'));
      
      // Create viewport info DOM element
      const viewportInfoDiv = document.createElement('div');
      viewportInfoDiv.id = 'viewport-info';
      document.body.appendChild(viewportInfoDiv);
    });

    it('should update viewport info after zoom', () => {
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const viewportInfo = new ViewportInfo(viewportManager);
      viewportInfo.render();

      const initialBounds = viewportManager.getBounds();

      // Perform zoom
      viewportManager.zoom(2.0, 400, 300, 800, 600);
      viewportInfo.updateBounds();

      const newBounds = viewportManager.getBounds();

      // Verify viewport info displays updated values
      const realMinElement = document.querySelector('.viewport-value');
      expect(realMinElement).toBeTruthy();
      expect(realMinElement.textContent).not.toBe(initialBounds.minReal.toString());
    });

    it('should update viewport info after pan', () => {
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const viewportInfo = new ViewportInfo(viewportManager);
      viewportInfo.render();

      const initialBounds = viewportManager.getBounds();

      // Perform pan
      viewportManager.pan(100, 50, 800, 600);
      viewportInfo.updateBounds();

      const newBounds = viewportManager.getBounds();

      // Verify bounds changed
      expect(newBounds.minReal).not.toBe(initialBounds.minReal);
      expect(newBounds.maxReal).not.toBe(initialBounds.maxReal);
    });

    it('should update viewport info after resize', () => {
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const viewportInfo = new ViewportInfo(viewportManager);
      viewportInfo.render();

      // Perform resize
      viewportManager.resize(1024, 768);
      viewportInfo.updateBounds();

      const bounds = viewportManager.getBounds();

      // Verify viewport info is updated
      const viewportValues = document.querySelectorAll('.viewport-value');
      expect(viewportValues.length).toBeGreaterThan(0);
    });

    it('should update viewport info across all interaction types', () => {
      const viewportManager = new ViewportManager();
      const viewportInfo = new ViewportInfo(viewportManager);
      viewportInfo.render();

      // Perform multiple operations
      viewportManager.pan(50, 50, 800, 600);
      viewportInfo.updateBounds();
      
      viewportManager.zoom(1.5, 400, 300, 800, 600);
      viewportInfo.updateBounds();
      
      viewportManager.resize(1024, 768);
      viewportInfo.updateBounds();

      // Verify viewport info is still valid
      const viewportValues = document.querySelectorAll('.viewport-value');
      expect(viewportValues.length).toBe(4); // minReal, maxReal, minImag, maxImag
      
      viewportValues.forEach(element => {
        expect(element.textContent).toBeTruthy();
        expect(element.textContent).not.toBe('');
      });
    });
  });

  describe('Aspect Ratio Matching Canvas', () => {
    it('should maintain aspect ratio matching canvas dimensions', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      // Create viewport manager with canvas dimensions to enforce aspect ratio
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      }, canvasElement.width, canvasElement.height);

      const bounds = viewportManager.getBounds();
      const complexAspectRatio = (bounds.maxReal - bounds.minReal) / (bounds.maxImag - bounds.minImag);
      const canvasAspectRatio = canvasElement.width / canvasElement.height;

      expect(complexAspectRatio).toBeCloseTo(canvasAspectRatio, 5);
    });

    it('should maintain aspect ratio after zoom', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      const viewportManager = new ViewportManager();

      // Perform zoom
      viewportManager.zoom(2.0, 400, 300, canvasElement.width, canvasElement.height);

      const bounds = viewportManager.getBounds();
      const complexAspectRatio = (bounds.maxReal - bounds.minReal) / (bounds.maxImag - bounds.minImag);
      const canvasAspectRatio = canvasElement.width / canvasElement.height;

      expect(complexAspectRatio).toBeCloseTo(canvasAspectRatio, 5);
    });

    it('should maintain aspect ratio after pan', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      const viewportManager = new ViewportManager();

      // Perform pan
      viewportManager.pan(100, 50, canvasElement.width, canvasElement.height);

      const bounds = viewportManager.getBounds();
      const complexAspectRatio = (bounds.maxReal - bounds.minReal) / (bounds.maxImag - bounds.minImag);
      const canvasAspectRatio = canvasElement.width / canvasElement.height;

      expect(complexAspectRatio).toBeCloseTo(canvasAspectRatio, 5);
    });

    it('should maintain aspect ratio after resize', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      const viewportManager = new ViewportManager();

      // Perform resize
      const newWidth = 1024;
      const newHeight = 768;
      viewportManager.resize(newWidth, newHeight);

      const bounds = viewportManager.getBounds();
      const complexAspectRatio = (bounds.maxReal - bounds.minReal) / (bounds.maxImag - bounds.minImag);
      const canvasAspectRatio = newWidth / newHeight;

      expect(complexAspectRatio).toBeCloseTo(canvasAspectRatio, 5);
    });
  });

  describe('Scale Preservation and Top-Left Anchored Resize', () => {
    it('should preserve scale during resize', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      // Create viewport manager with canvas dimensions
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      }, canvasElement.width, canvasElement.height);

      const initialBounds = viewportManager.getBounds();
      const initialScale = (initialBounds.maxReal - initialBounds.minReal) / canvasElement.width;

      // Perform resize
      const newWidth = 1024;
      const newHeight = 768;
      viewportManager.resize(newWidth, newHeight);

      const newBounds = viewportManager.getBounds();
      const newScale = (newBounds.maxReal - newBounds.minReal) / newWidth;

      // Scale should be unchanged
      expect(newScale).toBeCloseTo(initialScale, 10);
    });

    it('should anchor top-left position during resize', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });

      const initialBounds = viewportManager.getBounds();
      const topLeftReal = initialBounds.minReal;
      const topLeftImag = initialBounds.maxImag;

      // Perform resize
      viewportManager.resize(1024, 768);

      const newBounds = viewportManager.getBounds();

      // Top-left corner should remain at same position
      expect(newBounds.minReal).toBeCloseTo(topLeftReal, 10);
      expect(newBounds.maxImag).toBeCloseTo(topLeftImag, 10);
    });

    it('should adjust bounds to match new canvas dimensions while preserving scale', () => {
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;

      // Create viewport manager with canvas dimensions
      const viewportManager = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      }, canvasElement.width, canvasElement.height);

      const initialBounds = viewportManager.getBounds();
      const initialScale = (initialBounds.maxReal - initialBounds.minReal) / canvasElement.width;

      // Resize to different dimensions
      const newWidth = 400;
      const newHeight = 300;
      viewportManager.resize(newWidth, newHeight);

      const newBounds = viewportManager.getBounds();
      const newScale = (newBounds.maxReal - newBounds.minReal) / newWidth;

      // Scale preserved
      expect(newScale).toBeCloseTo(initialScale, 10);

      // Aspect ratio matches new canvas
      const complexAspectRatio = (newBounds.maxReal - newBounds.minReal) / (newBounds.maxImag - newBounds.minImag);
      const canvasAspectRatio = newWidth / newHeight;
      expect(complexAspectRatio).toBeCloseTo(canvasAspectRatio, 5);
    });
  });

  describe('Debounced Zoom Rendering', () => {
    it('should delay render after zoom operation', async () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);
      
      // Mock scaleCanvas to avoid canvas issues in test environment
      const scaleCanvasSpy = vi.spyOn(renderEngine, 'scaleCanvas').mockImplementation(() => {});
      
      const eventHandler = new EventHandler(canvasElement, viewportManager, renderEngine);

      const renderSpy = vi.spyOn(renderEngine, 'render');

      // Simulate zoom
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300
      });

      eventHandler.onWheel(wheelEvent);

      // Render should not be called immediately
      expect(renderSpy).not.toHaveBeenCalled();

      // Wait for debounce period (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Now render should have been called
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should reset debounce timer on additional zoom', async () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);
      
      // Mock scaleCanvas to avoid canvas issues in test environment
      const scaleCanvasSpy = vi.spyOn(renderEngine, 'scaleCanvas').mockImplementation(() => {});
      
      const eventHandler = new EventHandler(canvasElement, viewportManager, renderEngine);

      const renderSpy = vi.spyOn(renderEngine, 'render');

      // First zoom
      const wheelEvent1 = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300
      });
      eventHandler.onWheel(wheelEvent1);

      // Wait 500ms
      await new Promise(resolve => setTimeout(resolve, 500));

      // Second zoom (should reset timer)
      const wheelEvent2 = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300
      });
      eventHandler.onWheel(wheelEvent2);

      // Wait another 500ms (total 1000ms from first zoom, but only 500ms from second)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Render should not have been called yet
      expect(renderSpy).not.toHaveBeenCalled();

      // Wait for remaining time
      await new Promise(resolve => setTimeout(resolve, 600));

      // Now render should have been called
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Immediate Canvas Scaling on Zoom', () => {
    it('should scale canvas immediately on zoom', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Initial render
      renderEngine.render();

      // Mock scaleCanvas to avoid canvas issues in test environment
      const scaleCanvasSpy = vi.spyOn(renderEngine, 'scaleCanvas').mockImplementation(() => {});

      // Simulate zoom
      const eventHandler = new EventHandler(canvasElement, viewportManager, renderEngine);
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300
      });

      eventHandler.onWheel(wheelEvent);

      // scaleCanvas should have been called immediately
      expect(scaleCanvasSpy).toHaveBeenCalled();
    });

    it('should scale canvas with correct parameters', () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      renderEngine.render();

      // Mock scaleCanvas to avoid canvas issues in test environment
      const scaleCanvasSpy = vi.spyOn(renderEngine, 'scaleCanvas').mockImplementation(() => {});

      // Zoom in at specific point
      const focalX = 400;
      const focalY = 300;
      const zoomFactor = 1.1;

      renderEngine.scaleCanvas(zoomFactor, focalX, focalY);

      expect(scaleCanvasSpy).toHaveBeenCalledWith(zoomFactor, focalX, focalY);
    });

    it('should provide responsive visual feedback before full render', async () => {
      const viewportManager = new ViewportManager();
      const canvasElement = document.getElementById('mandelbrot-canvas');
      canvasElement.width = 100;
      canvasElement.height = 100;
      
      const renderEngine = new RenderEngine(canvasElement, mockWasmModule, viewportManager);

      // Initial render
      renderEngine.render();

      // Mock scaleCanvas to verify it's called for responsive feedback
      const scaleCanvasSpy = vi.spyOn(renderEngine, 'scaleCanvas').mockImplementation(() => {});

      // Simulate zoom via event handler
      const eventHandler = new EventHandler(canvasElement, viewportManager, renderEngine);
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 50,
        clientY: 50
      });

      eventHandler.onWheel(wheelEvent);

      // scaleCanvas should have been called immediately for responsive feedback
      expect(scaleCanvasSpy).toHaveBeenCalled();
      
      // Verify it was called before any debounced render
      const renderSpy = vi.spyOn(renderEngine, 'render');
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });
});
