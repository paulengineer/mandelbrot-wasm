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
   */
  constructor(canvas, viewportManager, renderEngine) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;
    this.renderEngine = renderEngine;
    
    // Mouse state tracking
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
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
    
    // Update viewport using ViewportManager
    // Note: We pass negative deltas because dragging right should move the view left
    // (i.e., we're moving the viewport in the opposite direction of the mouse)
    this.viewportManager.pan(
      -deltaX,
      -deltaY,
      this.canvas.width,
      this.canvas.height
    );
    
    // Update last mouse position for next move event
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    
    // Trigger immediate re-render for smooth panning feedback
    this.renderEngine.render();
    
    // Prevent default behavior
    event.preventDefault();
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
      
      // Trigger final render after pan completes
      // (This may be redundant if we rendered on every move, but ensures
      // we have a final render even if the mouse didn't move)
      this.renderEngine.render();
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
    
    // Pass zoom parameters to ViewportManager
    this.viewportManager.zoom(
      zoomFactor,
      focalX,
      focalY,
      this.canvas.width,
      this.canvas.height
    );
    
    // Trigger render after zoom completes
    this.renderEngine.render();
  }

  /**
   * Get current panning state
   * @returns {boolean} True if currently panning
   */
  isPanningActive() {
    return this.isPanning;
  }
}
