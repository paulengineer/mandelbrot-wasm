/**
 * Unit tests for ViewportInfo
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ViewportInfo } from '../../src/viewportInfo.js';
import { ViewportManager } from '../../src/viewportManager.js';

describe('ViewportInfo', () => {
  let viewportInfo;
  let viewportManager;
  let container;

  beforeEach(() => {
    // Create mock DOM container
    container = document.createElement('div');
    container.id = 'viewport-info';
    document.body.appendChild(container);

    // Create ViewportManager instance with default bounds
    viewportManager = new ViewportManager({
      minReal: -2.0,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });

    // Create ViewportInfo instance
    viewportInfo = new ViewportInfo(viewportManager);
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    viewportInfo = null;
    viewportManager = null;
  });

  describe('constructor', () => {
    it('should initialize with viewport manager reference', () => {
      expect(viewportInfo.viewportManager).toBe(viewportManager);
    });

    it('should initialize with null container', () => {
      expect(viewportInfo.container).toBeNull();
    });
  });

  describe('render', () => {
    it('should render viewport info UI', () => {
      viewportInfo.render();

      // Check that title is rendered
      const title = container.querySelector('h3');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Viewport');
    });

    it('should create real axis section', () => {
      viewportInfo.render();

      const realSection = container.querySelector('.viewport-axis');
      expect(realSection).toBeTruthy();

      const realLabel = realSection.querySelector('.viewport-axis-label');
      expect(realLabel).toBeTruthy();
      expect(realLabel.textContent).toBe('Real:');
    });

    it('should create imaginary axis section', () => {
      viewportInfo.render();

      const axisSections = container.querySelectorAll('.viewport-axis');
      expect(axisSections.length).toBe(2);

      const imagLabel = axisSections[1].querySelector('.viewport-axis-label');
      expect(imagLabel).toBeTruthy();
      expect(imagLabel.textContent).toBe('Imag:');
    });

    it('should display initial viewport bounds', () => {
      viewportInfo.render();

      const values = container.querySelectorAll('.viewport-value');
      expect(values.length).toBe(4); // minReal, maxReal, minImag, maxImag

      // Check that values are displayed (not empty)
      values.forEach(value => {
        expect(value.textContent).not.toBe('');
      });
    });

    it('should handle missing container gracefully', () => {
      // Remove container from DOM
      container.parentNode.removeChild(container);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      viewportInfo.render();

      expect(consoleSpy).toHaveBeenCalledWith('Viewport info container not found in DOM');

      consoleSpy.mockRestore();
    });
  });

  describe('formatValue', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should format zero correctly', () => {
      expect(viewportInfo.formatValue(0)).toBe('0.0');
    });

    it('should format large numbers in exponential notation', () => {
      const result = viewportInfo.formatValue(1234.5678);
      expect(result).toContain('e');
      expect(result).toMatch(/1\.2346e\+3/i);
    });

    it('should format numbers >= 1 with 4 decimal places', () => {
      expect(viewportInfo.formatValue(2.5)).toBe('2.5000');
      expect(viewportInfo.formatValue(1.0)).toBe('1.0000');
    });

    it('should format small numbers with 6 decimal places', () => {
      expect(viewportInfo.formatValue(0.001234)).toBe('0.001234');
      expect(viewportInfo.formatValue(0.5)).toBe('0.500000');
    });

    it('should format very small numbers in exponential notation', () => {
      const result = viewportInfo.formatValue(0.00001);
      expect(result).toContain('e');
      expect(result).toMatch(/1\.0000e-5/i);
    });

    it('should format very large numbers in exponential notation', () => {
      const result = viewportInfo.formatValue(10000);
      expect(result).toContain('e');
      expect(result).toMatch(/1\.0000e\+4/i);
    });

    it('should handle negative numbers', () => {
      expect(viewportInfo.formatValue(-2.5)).toBe('-2.5000');
      expect(viewportInfo.formatValue(-0.001)).toBe('-0.001000');
    });
  });

  describe('updateBounds', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should update displayed bounds from viewport manager', () => {
      // Change viewport bounds
      viewportManager.minReal = -3.0;
      viewportManager.maxReal = 2.0;
      viewportManager.minImag = -1.5;
      viewportManager.maxImag = 1.5;

      viewportInfo.updateBounds();

      // Check that displayed values match new bounds
      expect(viewportInfo.realMinElement.textContent).toBe('-3.0000');
      expect(viewportInfo.realMaxElement.textContent).toBe('2.0000');
      expect(viewportInfo.imagMinElement.textContent).toBe('-1.5000');
      expect(viewportInfo.imagMaxElement.textContent).toBe('1.5000');
    });

    it('should update bounds after zoom', () => {
      // Simulate zoom operation
      viewportManager.zoom(2.0, 400, 300, 800, 600);

      viewportInfo.updateBounds();

      const bounds = viewportManager.getBounds();
      expect(viewportInfo.realMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minReal));
      expect(viewportInfo.realMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxReal));
    });

    it('should update bounds after pan', () => {
      // Simulate pan operation
      viewportManager.pan(100, 50, 800, 600);

      viewportInfo.updateBounds();

      const bounds = viewportManager.getBounds();
      expect(viewportInfo.realMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minReal));
      expect(viewportInfo.imagMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxImag));
    });

    it('should warn if container is not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create new instance without rendering
      const newViewportInfo = new ViewportInfo(viewportManager);
      newViewportInfo.updateBounds();

      expect(consoleSpy).toHaveBeenCalledWith('ViewportInfo container not initialized');

      consoleSpy.mockRestore();
    });
  });

  describe('setVisible', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should hide the viewport info', () => {
      viewportInfo.setVisible(false);
      expect(container.style.display).toBe('none');
    });

    it('should show the viewport info', () => {
      viewportInfo.setVisible(false);
      viewportInfo.setVisible(true);
      expect(container.style.display).toBe('block');
    });

    it('should handle null container gracefully', () => {
      viewportInfo.container = null;
      
      // Should not throw error
      expect(() => viewportInfo.setVisible(true)).not.toThrow();
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should clear element references', () => {
      viewportInfo.destroy();

      expect(viewportInfo.realMinElement).toBeNull();
      expect(viewportInfo.realMaxElement).toBeNull();
      expect(viewportInfo.imagMinElement).toBeNull();
      expect(viewportInfo.imagMaxElement).toBeNull();
      expect(viewportInfo.container).toBeNull();
    });
  });

  describe('integration with ViewportManager', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should display correct initial bounds', () => {
      const bounds = viewportManager.getBounds();

      expect(viewportInfo.realMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minReal));
      expect(viewportInfo.realMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxReal));
      expect(viewportInfo.imagMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minImag));
      expect(viewportInfo.imagMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxImag));
    });

    it('should reflect viewport changes after multiple operations', () => {
      // Perform multiple viewport operations
      viewportManager.zoom(2.0, 400, 300, 800, 600);
      viewportManager.pan(50, -30, 800, 600);
      viewportManager.zoom(0.5, 400, 300, 800, 600);

      viewportInfo.updateBounds();

      const bounds = viewportManager.getBounds();
      expect(viewportInfo.realMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minReal));
      expect(viewportInfo.realMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxReal));
      expect(viewportInfo.imagMinElement.textContent).toBe(viewportInfo.formatValue(bounds.minImag));
      expect(viewportInfo.imagMaxElement.textContent).toBe(viewportInfo.formatValue(bounds.maxImag));
    });
  });

  describe('CSS classes', () => {
    beforeEach(() => {
      viewportInfo.render();
    });

    it('should apply correct CSS classes to elements', () => {
      const axisSections = container.querySelectorAll('.viewport-axis');
      expect(axisSections.length).toBe(2);

      const labels = container.querySelectorAll('.viewport-axis-label');
      expect(labels.length).toBe(2);

      const values = container.querySelectorAll('.viewport-axis-values');
      expect(values.length).toBe(2);

      const valueSpans = container.querySelectorAll('.viewport-value');
      expect(valueSpans.length).toBe(4);

      const separators = container.querySelectorAll('.viewport-separator');
      expect(separators.length).toBe(2);
    });

    it('should have correct separator text', () => {
      const separators = container.querySelectorAll('.viewport-separator');
      separators.forEach(separator => {
        expect(separator.textContent).toBe(' to ');
      });
    });
  });
});
