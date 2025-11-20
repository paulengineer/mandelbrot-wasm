/**
 * ViewportManager
 * 
 * Manages the viewport state representing the visible region of the complex plane.
 * Handles coordinate transformations between canvas pixels and complex plane coordinates.
 */
export class ViewportManager {
  /**
   * Create a new ViewportManager
   * @param {Object} initialBounds - Initial viewport boundaries
   * @param {number} initialBounds.minReal - Minimum real component (left edge)
   * @param {number} initialBounds.maxReal - Maximum real component (right edge)
   * @param {number} initialBounds.minImag - Minimum imaginary component (bottom edge)
   * @param {number} initialBounds.maxImag - Maximum imaginary component (top edge)
   */
  constructor(initialBounds = {
    minReal: -2.5,
    maxReal: 1.0,
    minImag: -1.0,
    maxImag: 1.0
  }) {
    this.minReal = initialBounds.minReal;
    this.maxReal = initialBounds.maxReal;
    this.minImag = initialBounds.minImag;
    this.maxImag = initialBounds.maxImag;
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
  }
}
