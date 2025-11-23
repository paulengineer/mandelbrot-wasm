/**
 * EventHandler
 * 
 * Captures and processes user input events for panning and zooming.
 * Manages mouse state and delegates viewport updates to ViewportManager.
 */

export class EventHandler {
  /**
   * Create a new EventHandler
   * @param {HTMLCanvasElement} canvas - The canvas element to attach event listeners to
   * @param {ViewportManager} viewportManager - Viewport manager for coordinate updates
   * @param {RenderEngine} renderEngine - Render engine to trigger re-renders
   * @param {Function} onRenderComplete - Optional callback called after each render with render time
   * @param {ViewportInfo} viewportInfo - Optional viewport info UI to update after viewport changes
   */
  constructor(canvas, viewportManager, renderEngine, onRenderComplete = null, viewportInfo = null) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;
    this.renderEngine = renderEngine;
    this.onRenderComplete = onRenderComplete;
    this.viewportInfo = viewportInfo;
    
    // Mouse state tracking
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // Zoom debounce timer
    this.zoomDebounceTimer = null;
    this.zoomDebounceDelay = 1000; // 1000ms delay
    
    // Bind event handlers to maintain 'this' context
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleWheel = this.onWheel.bind(this);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to the canvas
   */
  attachEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel);
    
    // Also listen for mouseup on document to handle cases where
    // the user releases the mouse button outside the canvas
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Remove event listeners from the canvas
   * Call this when cleaning up the EventHandler
   */
  detachEventListeners() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Handle mouse down event - initiate pan mode
   * @param {MouseEvent} event - Mouse event
   */
  onMouseDown(event) {
    // Only handle left mouse button
    if (event.button !== 0) {
      return;
    }
    
    // Initiate pan mode
    this.isPanning = true;
    
    // Store initial mouse position
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    
    // Prevent default behavior (e.g., text selection)
    event.preventDefault();
  }

  /**
   * Handle mouse move event - track cursor movement while button is held
   * @param {MouseEvent} event - Mouse event
   */
  onMouseMove(event) {
    // Only process movement if we're in pan mode
    if (!this.isPanning) {
      return;
    }
    
    // Calculate pixel deltas from last position
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    if (deltaX===0 && deltaY===0) return;
        
    // Scale the existing canvas image immediately for responsive feedback
    this.renderEngine.panCanvas(deltaX, deltaY);

    // Update viewport using ViewportManager
    this.viewportManager.pan(
      deltaX,
      deltaY,
      this.canvas.width,
      this.canvas.height
    );
    
    // Update viewport info after pan
    if (this.viewportInfo) {
      this.viewportInfo.updateBounds();
    }
    
    // Update last mouse position for next move event
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    
    // Prevent default behavior
    event.preventDefault();

    // Start or reset debounce timer for full re-render
    // This ensures we only render once after pan operations complete
    this.startZoomDebounce();
  }

  /**
   * Handle mouse up event - complete pan operation
   * @param {MouseEvent} event - Mouse event
   */
  onMouseUp(event) {
    // Only handle left mouse button
    if (event.button !== 0) {
      return;
    }
    
    // Exit pan mode
    if (this.isPanning) {
      this.isPanning = false;
      
      // Update viewport info after pan completes
      if (this.viewportInfo) {
        this.viewportInfo.updateBounds();
      }
      
      // Trigger final render after pan completes
      // (This may be redundant if we rendered on every move, but ensures
      // we have a final render even if the mouse didn't move)
      const renderTime = this.renderEngine.render();
      if (this.onRenderComplete) {
        this.onRenderComplete(renderTime);
      }
    }
  }

  /**
   * Handle wheel event - zoom in or out
   * @param {WheelEvent} event - Wheel event
   */
  onWheel(event) {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    // Calculate zoom factor from wheel delta
    // Positive deltaY means scrolling down (zoom out)
    // Negative deltaY means scrolling up (zoom in)
    // We use a base zoom factor and adjust based on the wheel delta
    const zoomSensitivity = 0.001;
    const zoomFactor = Math.exp(-event.deltaY * zoomSensitivity);
    
    // Get cursor position as focal point
    // Use offsetX/offsetY for position relative to canvas
    const focalX = event.offsetX;
    const focalY = event.offsetY;
    
    // Scale the existing canvas image immediately for responsive feedback
    this.renderEngine.scaleCanvas(zoomFactor, focalX, focalY);
    
    // Pass zoom parameters to ViewportManager
    this.viewportManager.zoom(
      zoomFactor,
      focalX,
      focalY,
      this.canvas.width,
      this.canvas.height
    );
    
    // Update viewport info after zoom
    if (this.viewportInfo) {
      this.viewportInfo.updateBounds();
    }
    
    // Start or reset debounce timer for full re-render
    // This ensures we only render once after zoom operations complete
    this.startZoomDebounce();
  }

  /**
   * Get current panning state
   * @returns {boolean} True if currently panning
   */
  isPanningActive() {
    return this.isPanning;
  }

  /**
   * Start or reset the zoom debounce timer
   * Triggers a full re-render after the debounce delay expires
   */
  startZoomDebounce() {
    // Cancel any existing timer
    this.cancelZoomDebounce();
    
    // Start new timer
    this.zoomDebounceTimer = setTimeout(() => {
      // Trigger full re-render when timer expires
      const renderTime = this.renderEngine.render();
      if (this.onRenderComplete) {
        this.onRenderComplete(renderTime);
      }
      this.zoomDebounceTimer = null;
    }, this.zoomDebounceDelay);
  }

  /**
   * Cancel the zoom debounce timer
   * Call this when other interactions occur that should cancel pending zoom renders
   */
  cancelZoomDebounce() {
    if (this.zoomDebounceTimer !== null) {
      clearTimeout(this.zoomDebounceTimer);
      this.zoomDebounceTimer = null;
    }
  }
}
