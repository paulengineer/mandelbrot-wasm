/**
 * ViewportInfo
 * 
 * Displays current viewport boundaries in the complex plane as an overlay.
 * Shows min/max values for real and imaginary axes with appropriate precision.
 */

export class ViewportInfo {
  /**
   * Create a new ViewportInfo
   * @param {ViewportManager} viewportManager - Reference to the viewport manager
   */
  constructor(viewportManager) {
    this.viewportManager = viewportManager;
    this.container = null;
    this.realMinElement = null;
    this.realMaxElement = null;
    this.imagMinElement = null;
    this.imagMaxElement = null;
  }

  /**
   * Format a number with appropriate precision for display
   * @param {number} value - Number to format
   * @returns {string} Formatted number string
   */
  formatValue(value) {
    // Determine appropriate precision based on magnitude
    const absValue = Math.abs(value);
    
    if (absValue === 0) {
      return '0.0';
    } else if (absValue >= 1000) {
      return value.toExponential(4);
    } else if (absValue >= 1) {
      return value.toFixed(4);
    } else if (absValue >= 0.0001) {
      return value.toFixed(6);
    } else {
      return value.toExponential(4);
    }
  }

  /**
   * Update displayed viewport bounds
   * Reads current bounds from viewport manager and updates the UI
   */
  updateBounds() {
    if (!this.container) {
      console.warn('ViewportInfo container not initialized');
      return;
    }

    const bounds = this.viewportManager.getBounds();

    // Update real axis values
    if (this.realMinElement) {
      this.realMinElement.textContent = this.formatValue(bounds.minReal);
    }
    if (this.realMaxElement) {
      this.realMaxElement.textContent = this.formatValue(bounds.maxReal);
    }

    // Update imaginary axis values
    if (this.imagMinElement) {
      this.imagMinElement.textContent = this.formatValue(bounds.minImag);
    }
    if (this.imagMaxElement) {
      this.imagMaxElement.textContent = this.formatValue(bounds.maxImag);
    }
  }

  /**
   * Render the viewport info UI
   * Creates and populates the viewport info overlay
   */
  render() {
    // Find or create the container element
    this.container = document.getElementById('viewport-info');
    
    if (!this.container) {
      console.error('Viewport info container not found in DOM');
      return;
    }

    // Clear existing content
    this.container.innerHTML = '';

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Viewport';
    this.container.appendChild(title);

    // Create real axis section
    const realSection = document.createElement('div');
    realSection.className = 'viewport-axis';
    
    const realLabel = document.createElement('div');
    realLabel.className = 'viewport-axis-label';
    realLabel.textContent = 'Real:';
    realSection.appendChild(realLabel);
    
    const realValues = document.createElement('div');
    realValues.className = 'viewport-axis-values';
    
    this.realMinElement = document.createElement('span');
    this.realMinElement.className = 'viewport-value';
    
    const realSeparator = document.createElement('span');
    realSeparator.className = 'viewport-separator';
    realSeparator.textContent = ' to ';
    
    this.realMaxElement = document.createElement('span');
    this.realMaxElement.className = 'viewport-value';
    
    realValues.appendChild(this.realMinElement);
    realValues.appendChild(realSeparator);
    realValues.appendChild(this.realMaxElement);
    realSection.appendChild(realValues);
    
    this.container.appendChild(realSection);

    // Create imaginary axis section
    const imagSection = document.createElement('div');
    imagSection.className = 'viewport-axis';
    
    const imagLabel = document.createElement('div');
    imagLabel.className = 'viewport-axis-label';
    imagLabel.textContent = 'Imag:';
    imagSection.appendChild(imagLabel);
    
    const imagValues = document.createElement('div');
    imagValues.className = 'viewport-axis-values';
    
    this.imagMinElement = document.createElement('span');
    this.imagMinElement.className = 'viewport-value';
    
    const imagSeparator = document.createElement('span');
    imagSeparator.className = 'viewport-separator';
    imagSeparator.textContent = ' to ';
    
    this.imagMaxElement = document.createElement('span');
    this.imagMaxElement.className = 'viewport-value';
    
    imagValues.appendChild(this.imagMinElement);
    imagValues.appendChild(imagSeparator);
    imagValues.appendChild(this.imagMaxElement);
    imagSection.appendChild(imagValues);
    
    this.container.appendChild(imagSection);

    // Initial update of bounds
    this.updateBounds();
  }

  /**
   * Show or hide the viewport info
   * @param {boolean} visible - Whether the viewport info should be visible
   */
  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Destroy the viewport info and clean up
   */
  destroy() {
    // Clear references
    this.realMinElement = null;
    this.realMaxElement = null;
    this.imagMinElement = null;
    this.imagMaxElement = null;
    this.container = null;
  }
}
