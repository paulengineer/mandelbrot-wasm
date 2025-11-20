/**
 * CanvasResizeHandler
 * 
 * Manages canvas resizing to match the browser viewport.
 * Ensures the canvas fills the entire viewport and triggers re-renders on resize.
 */

export class CanvasResizeHandler {
  /**
   * Create a new CanvasResizeHandler
   * @param {HTMLCanvasElement} canvas - The canvas element to manage
   * @param {RenderEngine} renderEngine - Render engine to trigger re-renders
   */
  constructor(canvas, renderEngine) {
    this.canvas = canvas;
    this.renderEngine = renderEngine;
    
    // Bind resize handler to maintain 'this' context
    this.handleResize = this.onResize.bind(this);
    
    // Set initial canvas size
    this.updateCanvasSize();
    
    // Attach resize event listener
    this.attachEventListener();
  }

  /**
   * Attach window resize event listener
   */
  attachEventListener() {
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Remove window resize event listener
   * Call this when cleaning up the CanvasResizeHandler
   */
  detachEventListener() {
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * Handle window resize event
   */
  onResize() {
    // Update canvas dimensions to match new viewport size
    this.updateCanvasSize();
    
    // Trigger re-render after resize
    this.renderEngine.render();
  }

  /**
   * Update canvas dimensions to match viewport size
   * Sets both the canvas element size and its internal drawing buffer size
   */
  updateCanvasSize() {
    // Get viewport dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update canvas dimensions
    // Setting canvas.width and canvas.height updates the drawing buffer size
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Also update CSS dimensions to ensure they match
    // (This is typically handled by CSS, but we set it explicitly for consistency)
    // Only set style if it exists (for browser environments)
    if (this.canvas.style) {
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
  }

  /**
   * Get current canvas dimensions
   * @returns {Object} Canvas dimensions {width, height}
   */
  getCanvasDimensions() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }
}
