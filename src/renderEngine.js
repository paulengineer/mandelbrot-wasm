/**
 * RenderEngine
 * 
 * Orchestrates the calculation and rendering of the Mandelbrot set.
 * Iterates over canvas pixels, calls WebAssembly calculation functions,
 * maps results to colors, and draws to the canvas.
 */

import { iterationToColor } from './colorPalette.js';

/**
 * Default calculation parameters
 */
const DEFAULT_MAX_ITERATIONS = 256;
const DEFAULT_ESCAPE_RADIUS = 2.0;

export class RenderEngine {
  /**
   * Create a new RenderEngine
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} wasmModule - WebAssembly module with calculatePoint function
   * @param {ViewportManager} viewportManager - Viewport manager for coordinate conversion
   * @param {Object} options - Optional rendering parameters
   * @param {number} options.maxIterations - Maximum iteration count
   * @param {number} options.escapeRadius - Escape threshold
   */
  constructor(canvas, wasmModule, viewportManager, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wasmModule = wasmModule;
    this.viewportManager = viewportManager;
    
    // Calculation parameters
    this.maxIterations = options.maxIterations || DEFAULT_MAX_ITERATIONS;
    this.escapeRadius = options.escapeRadius || DEFAULT_ESCAPE_RADIUS;
    
    // Verify canvas context
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    
    // Verify wasm module has required function
    if (!this.wasmModule || typeof this.wasmModule.calculatePoint !== 'function') {
      throw new Error('WebAssembly module must expose calculatePoint function');
    }
  }

  /**
   * Switch to a different WebAssembly module and trigger re-render
   * @param {Object} newModule - New WebAssembly module with calculatePoint function
   */
  setWasmModule(newModule) {
    if (!newModule || typeof newModule.calculatePoint !== 'function') {
      throw new Error('WebAssembly module must expose calculatePoint function');
    }
    this.wasmModule = newModule;
    // Trigger re-render with the new module
    this.render();
  }

  /**
   * Render the Mandelbrot set to the canvas
   * Iterates over all pixels, calculates iteration counts, maps to colors, and draws
   */
  render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Create ImageData buffer for efficient pixel manipulation
    const imageData = this.ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Get current viewport bounds
    const bounds = this.viewportManager.getBounds();
    
    // Iterate over each pixel in the canvas
    for (let canvasY = 0; canvasY < height; canvasY++) {
      for (let canvasX = 0; canvasX < width; canvasX++) {
        // Convert canvas coordinates to complex plane coordinates
        const { real, imag } = this.viewportManager.canvasToComplex(
          canvasX,
          canvasY,
          width,
          height
        );
        
        // Calculate iteration count for this point using WebAssembly
        const iterations = this.wasmModule.calculatePoint(
          real,
          imag,
          this.maxIterations,
          this.escapeRadius
        );
        
        // Map iteration count to color
        const color = iterationToColor(iterations, this.maxIterations);
        
        // Calculate pixel index in ImageData array (RGBA format)
        const pixelIndex = (canvasY * width + canvasX) * 4;
        
        // Set pixel color (RGBA)
        data[pixelIndex] = color.r;     // Red
        data[pixelIndex + 1] = color.g; // Green
        data[pixelIndex + 2] = color.b; // Blue
        data[pixelIndex + 3] = 255;     // Alpha (fully opaque)
      }
    }
    
    // Draw the ImageData to the canvas in one operation
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Update calculation parameters
   * @param {Object} params - New calculation parameters
   * @param {number} params.maxIterations - Maximum iteration count
   * @param {number} params.escapeRadius - Escape threshold
   */
  setCalculationParameters(params) {
    if (params.maxIterations !== undefined) {
      this.maxIterations = params.maxIterations;
    }
    if (params.escapeRadius !== undefined) {
      this.escapeRadius = params.escapeRadius;
    }
  }

  /**
   * Get current calculation parameters
   * @returns {Object} Current parameters
   */
  getCalculationParameters() {
    return {
      maxIterations: this.maxIterations,
      escapeRadius: this.escapeRadius
    };
  }
}
