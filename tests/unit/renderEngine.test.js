import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderEngine } from '../../src/renderEngine.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('RenderEngine', () => {
  let canvas;
  let mockWasmModule;
  let viewportManager;
  let renderEngine;

  beforeEach(() => {
    // Create a canvas using the canvas package
    canvas = createCanvas(100, 100);
    
    // Create a mock WebAssembly module with batch API
    mockWasmModule = {
      calculatePoint: vi.fn((real, imag, maxIterations, escapeRadius) => {
        // Simple mock: return 0 for points in set, maxIterations/2 for others
        const zReal = real;
        const zImag = imag;
        const magnitude = Math.sqrt(zReal * zReal + zImag * zImag);
        return magnitude < 2.0 ? maxIterations : Math.floor(maxIterations / 2);
      }),
      calculateMandelbrotSet: vi.fn((realCoords, imagCoords, maxIterations, escapeRadius) => {
        // Batch calculation mock
        const length = Math.min(realCoords.length, imagCoords.length);
        const results = new Uint32Array(length);
        
        for (let i = 0; i < length; i++) {
          const zReal = realCoords[i];
          const zImag = imagCoords[i];
          const magnitude = Math.sqrt(zReal * zReal + zImag * zImag);
          results[i] = magnitude < 2.0 ? maxIterations : Math.floor(maxIterations / 2);
        }
        
        return results;
      }),
      name: 'Mock',
      type: 'mock'
    };
    
    // Create viewport manager with default bounds
    viewportManager = new ViewportManager({
      minReal: -2.0,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });
    
    // Create render engine
    renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
  });

  describe('initialization', () => {
    it('should initialize with canvas, wasm module, and viewport manager', () => {
      expect(renderEngine.canvas).toBe(canvas);
      expect(renderEngine.wasmModule).toBe(mockWasmModule);
      expect(renderEngine.viewportManager).toBe(viewportManager);
    });

    it('should initialize with default calculation parameters', () => {
      const params = renderEngine.getCalculationParameters();
      expect(params.maxIterations).toBe(256);
      expect(params.escapeRadius).toBe(2.0);
    });

    it('should initialize with custom calculation parameters', () => {
      const customEngine = new RenderEngine(
        canvas,
        mockWasmModule,
        viewportManager,
        { maxIterations: 512, escapeRadius: 4.0 }
      );
      
      const params = customEngine.getCalculationParameters();
      expect(params.maxIterations).toBe(512);
      expect(params.escapeRadius).toBe(4.0);
    });

    it('should throw error if canvas context cannot be obtained', () => {
      const badCanvas = {
        getContext: () => null
      };
      
      expect(() => {
        new RenderEngine(badCanvas, mockWasmModule, viewportManager);
      }).toThrow('Failed to get 2D rendering context from canvas');
    });

    it('should throw error if wasm module does not expose calculateMandelbrotSet', () => {
      const badModule = {
        name: 'Bad',
        type: 'bad'
      };
      
      expect(() => {
        new RenderEngine(canvas, badModule, viewportManager);
      }).toThrow('WebAssembly module must expose calculateMandelbrotSet function');
    });
  });

  describe('render', () => {
    it('should create coordinate arrays with correct length', () => {
      // Use a small canvas for faster test
      canvas.width = 10;
      canvas.height = 10;
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call batch calculation once
      expect(mockWasmModule.calculateMandelbrotSet).toHaveBeenCalledTimes(1);
      
      // Check that coordinate arrays have correct length
      const call = mockWasmModule.calculateMandelbrotSet.mock.calls[0];
      const realCoords = call[0];
      const imagCoords = call[1];
      
      expect(realCoords.length).toBe(100); // 10 * 10 pixels
      expect(imagCoords.length).toBe(100);
    });

    it('should call batch calculation once (not per pixel)', () => {
      canvas.width = 10;
      canvas.height = 10;
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call calculateMandelbrotSet exactly once, not once per pixel
      expect(mockWasmModule.calculateMandelbrotSet).toHaveBeenCalledTimes(1);
      
      // Old per-pixel function should not be called
      expect(mockWasmModule.calculatePoint).not.toHaveBeenCalled();
    });

    it('should call batch calculation with correct parameters', () => {
      canvas.width = 10;
      canvas.height = 10;
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Check that the call has the correct structure
      const call = mockWasmModule.calculateMandelbrotSet.mock.calls[0];
      expect(call).toHaveLength(4);
      expect(call[0]).toBeInstanceOf(Float64Array); // realCoords
      expect(call[1]).toBeInstanceOf(Float64Array); // imagCoords
      expect(call[2]).toBe(256); // maxIterations
      expect(call[3]).toBe(2.0); // escapeRadius
    });

    it('should draw pixels to canvas', () => {
      canvas.width = 10;
      canvas.height = 10;
      
      const ctx = canvas.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call putImageData once to draw all pixels
      expect(putImageDataSpy).toHaveBeenCalledTimes(1);
      
      // Check that ImageData has correct dimensions
      const imageData = putImageDataSpy.mock.calls[0][0];
      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
    });

    it('should use viewport manager for coordinate conversion', () => {
      canvas.width = 10;
      canvas.height = 10;
      
      const canvasToComplexSpy = vi.spyOn(viewportManager, 'canvasToComplex');
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call canvasToComplex once for each pixel to build coordinate arrays
      expect(canvasToComplexSpy).toHaveBeenCalledTimes(100);
    });

    it('should handle different canvas sizes', () => {
      canvas.width = 20;
      canvas.height = 15;
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call batch calculation once with correct array size
      expect(mockWasmModule.calculateMandelbrotSet).toHaveBeenCalledTimes(1);
      
      const call = mockWasmModule.calculateMandelbrotSet.mock.calls[0];
      expect(call[0].length).toBe(300); // 20 * 15 pixels
      expect(call[1].length).toBe(300);
    });
    
    it('should correctly map results array to canvas pixels', () => {
      canvas.width = 5;
      canvas.height = 5;
      
      const ctx = canvas.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      // Should call putImageData once to draw all pixels
      expect(putImageDataSpy).toHaveBeenCalledTimes(1);
      
      // Check that ImageData has correct dimensions
      const imageData = putImageDataSpy.mock.calls[0][0];
      expect(imageData.width).toBe(5);
      expect(imageData.height).toBe(5);
      
      // Verify that all pixels have been set (not all zeros)
      const data = imageData.data;
      let hasNonZeroPixel = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
          hasNonZeroPixel = true;
          break;
        }
      }
      expect(hasNonZeroPixel).toBe(true);
    });

    it('should produce valid ImageData with RGBA values', () => {
      canvas.width = 5;
      canvas.height = 5;
      
      const ctx = canvas.getContext('2d');
      const putImageDataSpy = vi.spyOn(ctx, 'putImageData');
      
      renderEngine = new RenderEngine(canvas, mockWasmModule, viewportManager);
      renderEngine.render();
      
      const imageData = putImageDataSpy.mock.calls[0][0];
      const data = imageData.data;
      
      // Check that all pixels have valid RGBA values
      for (let i = 0; i < data.length; i += 4) {
        expect(data[i]).toBeGreaterThanOrEqual(0);     // R
        expect(data[i]).toBeLessThanOrEqual(255);
        expect(data[i + 1]).toBeGreaterThanOrEqual(0); // G
        expect(data[i + 1]).toBeLessThanOrEqual(255);
        expect(data[i + 2]).toBeGreaterThanOrEqual(0); // B
        expect(data[i + 2]).toBeLessThanOrEqual(255);
        expect(data[i + 3]).toBe(255);                 // A (fully opaque)
      }
    });
  });

  describe('setWasmModule', () => {
    it('should switch to a new wasm module', () => {
      const newModule = {
        calculateMandelbrotSet: vi.fn((realCoords, imagCoords) => {
          return new Uint32Array(realCoords.length).fill(100);
        }),
        name: 'New',
        type: 'new'
      };
      
      renderEngine.setWasmModule(newModule);
      
      expect(renderEngine.wasmModule).toBe(newModule);
    });

    it('should throw error if new module does not expose calculateMandelbrotSet', () => {
      const badModule = {
        name: 'Bad',
        type: 'bad'
      };
      
      expect(() => {
        renderEngine.setWasmModule(badModule);
      }).toThrow('WebAssembly module must expose calculateMandelbrotSet function');
    });

    it('should trigger re-render after module change', () => {
      canvas.width = 5;
      canvas.height = 5;
      
      const newModule = {
        calculateMandelbrotSet: vi.fn((realCoords, imagCoords) => {
          return new Uint32Array(realCoords.length).fill(100);
        }),
        name: 'New',
        type: 'new'
      };
      
      // Spy on render method
      const renderSpy = vi.spyOn(renderEngine, 'render');
      
      renderEngine.setWasmModule(newModule);
      
      // Render should be called automatically
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should use new module for rendering after switch', () => {
      canvas.width = 5;
      canvas.height = 5;
      
      const newModule = {
        calculateMandelbrotSet: vi.fn((realCoords, imagCoords) => {
          return new Uint32Array(realCoords.length).fill(100);
        }),
        name: 'New',
        type: 'new'
      };
      
      renderEngine.setWasmModule(newModule);
      
      // New module should be called (automatically by setWasmModule)
      expect(newModule.calculateMandelbrotSet).toHaveBeenCalled();
      // Old module should not be called
      expect(mockWasmModule.calculateMandelbrotSet).not.toHaveBeenCalled();
    });
  });

  describe('setCalculationParameters', () => {
    it('should update maxIterations', () => {
      renderEngine.setCalculationParameters({ maxIterations: 512 });
      
      const params = renderEngine.getCalculationParameters();
      expect(params.maxIterations).toBe(512);
    });

    it('should update escapeRadius', () => {
      renderEngine.setCalculationParameters({ escapeRadius: 4.0 });
      
      const params = renderEngine.getCalculationParameters();
      expect(params.escapeRadius).toBe(4.0);
    });

    it('should update both parameters', () => {
      renderEngine.setCalculationParameters({
        maxIterations: 1000,
        escapeRadius: 3.0
      });
      
      const params = renderEngine.getCalculationParameters();
      expect(params.maxIterations).toBe(1000);
      expect(params.escapeRadius).toBe(3.0);
    });

    it('should use updated parameters in render', () => {
      canvas.width = 5;
      canvas.height = 5;
      
      renderEngine.setCalculationParameters({
        maxIterations: 512,
        escapeRadius: 4.0
      });
      
      renderEngine.render();
      
      // Check that batch calculation was called with new parameters
      const call = mockWasmModule.calculateMandelbrotSet.mock.calls[0];
      expect(call[2]).toBe(512); // maxIterations
      expect(call[3]).toBe(4.0); // escapeRadius
    });
  });
});
