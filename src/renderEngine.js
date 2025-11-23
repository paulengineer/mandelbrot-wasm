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
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.wasmModule = wasmModule;
    this.viewportManager = viewportManager;
    
    // Calculation parameters
    this.maxIterations = options.maxIterations || DEFAULT_MAX_ITERATIONS;
    this.escapeRadius = options.escapeRadius || DEFAULT_ESCAPE_RADIUS;
    
    // Render timing
    this.lastRenderTime = 0;
    
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
   * Scale the existing canvas image immediately for responsive zoom feedback
   * Uses imageSmoothingEnabled for better visual quality during scaling
   * @param {number} scaleFactor - Zoom scale factor (>1 for zoom in, <1 for zoom out)
   * @param {number} focalX - X coordinate of zoom focal point in canvas pixels
   * @param {number} focalY - Y coordinate of zoom focal point in canvas pixels
   */
  scaleCanvas(scaleFactor, focalX, focalY) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Capture the current canvas content as ImageData
    const imageData = this.ctx.getImageData(0, 0, width, height);
    
    // Create a temporary canvas using the same canvas constructor as the main canvas
    // This ensures compatibility in both browser and Node.js environments
    const tempCanvas = this.canvas.constructor === HTMLCanvasElement || 
                       typeof this.canvas.constructor === 'undefined'
      ? (typeof document !== 'undefined' ? document.createElement('canvas') : this.canvas.cloneNode())
      : new this.canvas.constructor(width, height);
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Put the captured image data onto the temporary canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Clear the main canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Calculate the scaled dimensions
    const scaledWidth = width * scaleFactor;
    const scaledHeight = height * scaleFactor;
    
    // Calculate the offset to keep the focal point fixed
    // The focal point should remain at the same position after scaling
    const offsetX = focalX - (focalX * scaleFactor);
    const offsetY = focalY - (focalY * scaleFactor);
    
    // Enable image smoothing for better visual quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Draw the scaled image from the temporary canvas back to the main canvas
    this.ctx.drawImage(
      tempCanvas,
      0, 0, width, height,           // Source rectangle (entire temp canvas)
      offsetX, offsetY,               // Destination position
      scaledWidth, scaledHeight       // Destination size (scaled)
    );
  }

  /**
   * Translate the existing canvas image immediately for responsive pan feedback
   * @param {number} deltaX - X translate in canvas pixels
   * @param {number} deltaY - Y translate in canvas pixels
   */
  panCanvas(deltaX, deltaY) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Capture the current canvas content as ImageData
    const imageData = this.ctx.getImageData(0, 0, width, height);
    
    // Create a temporary canvas using the same canvas constructor as the main canvas
    // This ensures compatibility in both browser and Node.js environments
    const tempCanvas = this.canvas.constructor === HTMLCanvasElement || 
                       typeof this.canvas.constructor === 'undefined'
      ? (typeof document !== 'undefined' ? document.createElement('canvas') : this.canvas.cloneNode())
      : new this.canvas.constructor(width, height);
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Put the captured image data onto the temporary canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Clear the main canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw the image from the temporary canvas back to the main canvas in new position
    this.ctx.drawImage(
      tempCanvas,
      deltaX, deltaY     // Translated top left coordinates
    );
  }

  /**
   * Render the Mandelbrot set to the canvas
   * Iterates over all pixels, calculates iteration counts, maps to colors, and draws
   * @returns {number} Render time in milliseconds
   */
  render() {
    // Start timing
    const startTime = performance.now();
    
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
    
    // End timing and store result
    const endTime = performance.now();
    this.lastRenderTime = endTime - startTime;
    
    return this.lastRenderTime;
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

  /**
   * Get the last render time in milliseconds
   * @returns {number} Last render time in milliseconds
   */
  getLastRenderTime() {
    return this.lastRenderTime;
  }
}
