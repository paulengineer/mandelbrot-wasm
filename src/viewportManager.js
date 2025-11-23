/**
 * ViewportManager
 * 
 * Manages the viewport state representing the visible region of the complex plane.
 * Handles coordinate transformations between canvas pixels and complex plane coordinates.
 * Maintains 1:1 aspect ratio between real and imaginary axes.
 */
export class ViewportManager {
  /**
   * Create a new ViewportManager
   * @param {Object} initialBounds - Initial viewport boundaries
   * @param {number} initialBounds.minReal - Minimum real component (left edge)
   * @param {number} initialBounds.maxReal - Maximum real component (right edge)
   * @param {number} initialBounds.minImag - Minimum imaginary component (bottom edge)
   * @param {number} initialBounds.maxImag - Maximum imaginary component (top edge)
   * @param {number} canvasWidth - Initial canvas width (optional, for aspect ratio enforcement)
   * @param {number} canvasHeight - Initial canvas height (optional, for aspect ratio enforcement)
   */
  constructor(initialBounds = {
    minReal: -2.0,
    maxReal: 1.0,
    minImag: -1.0,
    maxImag: 1.0
  }, canvasWidth = null, canvasHeight = null) {
    this.minReal = initialBounds.minReal;
    this.maxReal = initialBounds.maxReal;
    this.minImag = initialBounds.minImag;
    this.maxImag = initialBounds.maxImag;
    
    // Store canvas dimensions for resize operations
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Enforce 1:1 aspect ratio if canvas dimensions are provided
    if (canvasWidth && canvasHeight) {
      this.enforceAspectRatio(canvasWidth, canvasHeight);
    }
  }
  
  /**
   * Enforce 1:1 aspect ratio constraint
   * Ensures (maxReal - minReal) / (maxImag - minImag) = canvasWidth / canvasHeight
   * Adjusts the imaginary range to match the canvas aspect ratio
   * @param {number} canvasWidth - Width of canvas (pixels)
   * @param {number} canvasHeight - Height of canvas (pixels)
   * @param {boolean} anchorTopLeft - If true, anchor at top-left corner; if false, center the adjustment
   */
  enforceAspectRatio(canvasWidth, canvasHeight, anchorTopLeft = false) {
    const realRange = this.maxReal - this.minReal;
    const imagRange = this.maxImag - this.minImag;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const viewportAspectRatio = realRange / imagRange;
    
    // If aspect ratios don't match, adjust the imaginary range
    if (Math.abs(viewportAspectRatio - canvasAspectRatio) > 1e-10) {
      // Calculate the required imaginary range to match canvas aspect ratio
      const requiredImagRange = realRange / canvasAspectRatio;
      
      if (anchorTopLeft) {
        // Anchor at top-left: keep maxImag fixed, adjust minImag
        this.minImag = this.maxImag - requiredImagRange;
      } else {
        // Center the adjustment: adjust both bounds symmetrically
        const imagCenter = (this.minImag + this.maxImag) / 2;
        this.minImag = imagCenter - requiredImagRange / 2;
        this.maxImag = imagCenter + requiredImagRange / 2;
      }
    }
  }

  /**
   * Get current viewport bounds
   * @returns {Object} Current viewport boundaries
   */
  getBounds() {
    return {
      minReal: this.minReal,
      maxReal: this.maxReal,
      minImag: this.minImag,
      maxImag: this.maxImag
    };
  }

  /**
   * Convert canvas coordinates to complex plane coordinates
   * @param {number} canvasX - X coordinate on canvas (pixels)
   * @param {number} canvasY - Y coordinate on canvas (pixels)
   * @param {number} canvasWidth - Width of canvas (pixels)
   * @param {number} canvasHeight - Height of canvas (pixels)
   * @returns {Object} Complex plane coordinates {real, imag}
   */
  canvasToComplex(canvasX, canvasY, canvasWidth, canvasHeight) {
    // Calculate the scale factors
    const realRange = this.maxReal - this.minReal;
    const imagRange = this.maxImag - this.minImag;

    // Convert canvas coordinates to complex plane
    // Note: Canvas Y increases downward, but imaginary axis increases upward
    const real = this.minReal + (canvasX / canvasWidth) * realRange;
    const imag = this.maxImag - (canvasY / canvasHeight) * imagRange;

    return { real, imag };
  }

  /**
   * Pan the viewport by translating it based on pixel deltas
   * @param {number} deltaX - Horizontal pixel movement (positive = right)
   * @param {number} deltaY - Vertical pixel movement (positive = down)
   * @param {number} canvasWidth - Width of canvas (pixels)
   * @param {number} canvasHeight - Height of canvas (pixels)
   */
  pan(deltaX, deltaY, canvasWidth, canvasHeight) {
    // Calculate the complex plane ranges
    const realRange = this.maxReal - this.minReal;
    const imagRange = this.maxImag - this.minImag;

    // Convert pixel deltas to complex plane deltas
    // Pixel movement to the right increases real component
    // Pixel movement down decreases imaginary component (canvas Y increases downward)
    const realDelta = (deltaX / canvasWidth) * realRange;
    const imagDelta = -(deltaY / canvasHeight) * imagRange;

    // Update viewport boundaries by translating them
    this.minReal -= realDelta;
    this.maxReal -= realDelta;
    this.minImag -= imagDelta;
    this.maxImag -= imagDelta;
    
    // Enforce 1:1 aspect ratio after pan
    this.enforceAspectRatio(canvasWidth, canvasHeight);
    
    // Update stored canvas dimensions
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Zoom the viewport around a focal point
   * @param {number} zoomFactor - Zoom factor (> 1 zooms in, < 1 zooms out)
   * @param {number} focalX - X coordinate of zoom focal point on canvas (pixels)
   * @param {number} focalY - Y coordinate of zoom focal point on canvas (pixels)
   * @param {number} canvasWidth - Width of canvas (pixels)
   * @param {number} canvasHeight - Height of canvas (pixels)
   */
  zoom(zoomFactor, focalX, focalY, canvasWidth, canvasHeight) {
    // Convert focal point from canvas coordinates to complex plane coordinates
    const focalPoint = this.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);

    // Calculate current viewport dimensions
    const realRange = this.maxReal - this.minReal;
    const imagRange = this.maxImag - this.minImag;

    // Calculate new viewport dimensions after zoom
    // zoomFactor > 1 means zoom in (smaller viewport)
    // zoomFactor < 1 means zoom out (larger viewport)
    const newRealRange = realRange / zoomFactor;
    const newImagRange = imagRange / zoomFactor;

    // Calculate the focal point's relative position within the viewport (0 to 1)
    const focalRealRatio = (focalPoint.real - this.minReal) / realRange;
    const focalImagRatio = (focalPoint.imag - this.minImag) / imagRange;

    // Update viewport boundaries to maintain focal point position
    // The focal point should remain at the same complex plane coordinate
    this.minReal = focalPoint.real - newRealRange * focalRealRatio;
    this.maxReal = focalPoint.real + newRealRange * (1 - focalRealRatio);
    this.minImag = focalPoint.imag - newImagRange * focalImagRatio;
    this.maxImag = focalPoint.imag + newImagRange * (1 - focalImagRatio);
    
    // Enforce 1:1 aspect ratio after zoom
    this.enforceAspectRatio(canvasWidth, canvasHeight);
    
    // Update stored canvas dimensions
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }
  
  /**
   * Update viewport for window resize
   * Maintains scale unchanged and anchors top-left position while preserving aspect ratio
   * @param {number} newCanvasWidth - New canvas width (pixels)
   * @param {number} newCanvasHeight - New canvas height (pixels)
   */
  resize(newCanvasWidth, newCanvasHeight) {
    // Use stored canvas dimensions if available, otherwise can't maintain scale
    const oldCanvasWidth = this.canvasWidth;
    const oldCanvasHeight = this.canvasHeight;
    
    // If old dimensions not available, just enforce aspect ratio with top-left anchoring
    if (oldCanvasWidth === null || oldCanvasHeight === null) {
      // Anchor at top-left corner: keep minReal and maxImag fixed
      // Adjust maxReal and minImag to maintain aspect ratio
      const imagRange = this.maxImag - this.minImag;
      const canvasAspectRatio = newCanvasWidth / newCanvasHeight;
      const requiredRealRange = imagRange * canvasAspectRatio;
      this.maxReal = this.minReal + requiredRealRange;
      
      // Update stored canvas dimensions
      this.canvasWidth = newCanvasWidth;
      this.canvasHeight = newCanvasHeight;
      return;
    }
    
    // Get current ranges (which already have aspect ratio matching old canvas)
    const currentRealRange = this.maxReal - this.minReal;
    const currentImagRange = this.maxImag - this.minImag;
    
    // Calculate current scale (units per pixel)
    const scaleX = currentRealRange / oldCanvasWidth;
    
    // Anchor at top-left corner (minReal, maxImag)
    // Keep minReal and maxImag fixed
    // Maintain X scale and adjust Y range to match aspect ratio
    const newRealRange = scaleX * newCanvasWidth;
    const newImagRange = newRealRange * (newCanvasHeight / newCanvasWidth);
    
    // Adjust maxReal (right edge) while keeping minReal (left edge) fixed
    this.maxReal = this.minReal + newRealRange;
    
    // Adjust minImag (bottom edge) while keeping maxImag (top edge) fixed
    this.minImag = this.maxImag - newImagRange;
    
    // Update stored canvas dimensions
    this.canvasWidth = newCanvasWidth;
    this.canvasHeight = newCanvasHeight;
  }
}
