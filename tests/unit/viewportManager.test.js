import { describe, it, expect, beforeEach } from 'vitest';
import { ViewportManager } from '../../src/viewportManager.js';

describe('ViewportManager', () => {
  let viewport;

  beforeEach(() => {
    // Initialize with default bounds
    viewport = new ViewportManager({
      minReal: -2.5,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });
  });

  describe('initialization', () => {
    it('should initialize with correct default bounds', () => {
      const bounds = viewport.getBounds();
      expect(bounds.minReal).toBe(-2.5);
      expect(bounds.maxReal).toBe(1.0);
      expect(bounds.minImag).toBe(-1.0);
      expect(bounds.maxImag).toBe(1.0);
    });

    it('should initialize with specification-compliant bounds (-2.0 to 1.0 real, -1.0 to 1.0 imaginary)', () => {
      // Requirements 1.5: Initial values should be -2.0 to 1.0 on real axis, -1.0 to 1.0 on imaginary axis
      const specViewport = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });
      
      const bounds = specViewport.getBounds();
      expect(bounds.minReal).toBe(-2.0);
      expect(bounds.maxReal).toBe(1.0);
      expect(bounds.minImag).toBe(-1.0);
      expect(bounds.maxImag).toBe(1.0);
    });

    it('should initialize with custom bounds when provided', () => {
      const customViewport = new ViewportManager({
        minReal: -1.0,
        maxReal: 0.5,
        minImag: -0.5,
        maxImag: 0.5
      });
      
      const bounds = customViewport.getBounds();
      expect(bounds.minReal).toBe(-1.0);
      expect(bounds.maxReal).toBe(0.5);
      expect(bounds.minImag).toBe(-0.5);
      expect(bounds.maxImag).toBe(0.5);
    });
  });

  describe('canvasToComplex', () => {
    it('should convert top-left corner correctly', () => {
      const result = viewport.canvasToComplex(0, 0, 800, 600);
      expect(result.real).toBeCloseTo(-2.5);
      expect(result.imag).toBeCloseTo(1.0);
    });

    it('should convert bottom-right corner correctly', () => {
      const result = viewport.canvasToComplex(800, 600, 800, 600);
      expect(result.real).toBeCloseTo(1.0);
      expect(result.imag).toBeCloseTo(-1.0);
    });

    it('should convert center correctly', () => {
      const result = viewport.canvasToComplex(400, 300, 800, 600);
      expect(result.real).toBeCloseTo(-0.75); // midpoint of -2.5 and 1.0
      expect(result.imag).toBeCloseTo(0.0);   // midpoint of -1.0 and 1.0
    });

    it('should convert canvas coordinates with specification-compliant viewport', () => {
      // Requirements 1.3, 1.5: Test coordinate conversion with spec viewport (-2.0 to 1.0 real, -1.0 to 1.0 imaginary)
      const specViewport = new ViewportManager({
        minReal: -2.0,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });
      
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Test top-left corner (0, 0) -> (-2.0, 1.0)
      const topLeft = specViewport.canvasToComplex(0, 0, canvasWidth, canvasHeight);
      expect(topLeft.real).toBeCloseTo(-2.0);
      expect(topLeft.imag).toBeCloseTo(1.0);
      
      // Test bottom-right corner (800, 600) -> (1.0, -1.0)
      const bottomRight = specViewport.canvasToComplex(canvasWidth, canvasHeight, canvasWidth, canvasHeight);
      expect(bottomRight.real).toBeCloseTo(1.0);
      expect(bottomRight.imag).toBeCloseTo(-1.0);
      
      // Test center (400, 300) -> (-0.5, 0.0)
      const center = specViewport.canvasToComplex(canvasWidth / 2, canvasHeight / 2, canvasWidth, canvasHeight);
      expect(center.real).toBeCloseTo(-0.5); // midpoint of -2.0 and 1.0
      expect(center.imag).toBeCloseTo(0.0);  // midpoint of -1.0 and 1.0
    });

    it('should convert known canvas coordinates correctly', () => {
      // Test with known values for verification
      const canvasWidth = 1000;
      const canvasHeight = 1000;
      
      // At (250, 250) with viewport (-2.5 to 1.0, -1.0 to 1.0)
      // Real: -2.5 + (250/1000) * 3.5 = -2.5 + 0.875 = -1.625
      // Imag: 1.0 - (250/1000) * 2.0 = 1.0 - 0.5 = 0.5
      const result1 = viewport.canvasToComplex(250, 250, canvasWidth, canvasHeight);
      expect(result1.real).toBeCloseTo(-1.625);
      expect(result1.imag).toBeCloseTo(0.5);
      
      // At (750, 750)
      // Real: -2.5 + (750/1000) * 3.5 = -2.5 + 2.625 = 0.125
      // Imag: 1.0 - (750/1000) * 2.0 = 1.0 - 1.5 = -0.5
      const result2 = viewport.canvasToComplex(750, 750, canvasWidth, canvasHeight);
      expect(result2.real).toBeCloseTo(0.125);
      expect(result2.imag).toBeCloseTo(-0.5);
    });

    it('should handle edge cases at canvas boundaries', () => {
      const canvasWidth = 640;
      const canvasHeight = 480;
      
      // Test all four corners
      const topLeft = viewport.canvasToComplex(0, 0, canvasWidth, canvasHeight);
      expect(topLeft.real).toBeCloseTo(-2.5);
      expect(topLeft.imag).toBeCloseTo(1.0);
      
      const topRight = viewport.canvasToComplex(canvasWidth, 0, canvasWidth, canvasHeight);
      expect(topRight.real).toBeCloseTo(1.0);
      expect(topRight.imag).toBeCloseTo(1.0);
      
      const bottomLeft = viewport.canvasToComplex(0, canvasHeight, canvasWidth, canvasHeight);
      expect(bottomLeft.real).toBeCloseTo(-2.5);
      expect(bottomLeft.imag).toBeCloseTo(-1.0);
      
      const bottomRight = viewport.canvasToComplex(canvasWidth, canvasHeight, canvasWidth, canvasHeight);
      expect(bottomRight.real).toBeCloseTo(1.0);
      expect(bottomRight.imag).toBeCloseTo(-1.0);
    });

    it('should convert coordinates proportionally to canvas size', () => {
      // Test that conversion scales correctly with different canvas sizes
      const smallCanvas = viewport.canvasToComplex(100, 100, 200, 200);
      const largeCanvas = viewport.canvasToComplex(400, 400, 800, 800);
      
      // Both should map to the same complex coordinate (halfway point)
      expect(smallCanvas.real).toBeCloseTo(largeCanvas.real);
      expect(smallCanvas.imag).toBeCloseTo(largeCanvas.imag);
    });
  });

  describe('pan', () => {
    it('should translate viewport right when deltaX is positive', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Pan 100 pixels to the right
      viewport.pan(100, 0, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Moving right means we're looking at a region further left in the complex plane
      // So both minReal and maxReal should decrease
      expect(bounds.minReal).toBeLessThan(-2.5);
      expect(bounds.maxReal).toBeLessThan(1.0);
      
      // Imaginary bounds should remain unchanged
      expect(bounds.minImag).toBeCloseTo(-1.0);
      expect(bounds.maxImag).toBeCloseTo(1.0);
      
      // The range should remain the same
      const newRealRange = bounds.maxReal - bounds.minReal;
      expect(newRealRange).toBeCloseTo(3.5); // original range: 1.0 - (-2.5) = 3.5
    });

    it('should translate viewport left when deltaX is negative', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Pan 100 pixels to the left
      viewport.pan(-100, 0, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Moving left means we're looking at a region further right in the complex plane
      // So both minReal and maxReal should increase
      expect(bounds.minReal).toBeGreaterThan(-2.5);
      expect(bounds.maxReal).toBeGreaterThan(1.0);
      
      // Imaginary bounds should remain unchanged
      expect(bounds.minImag).toBeCloseTo(-1.0);
      expect(bounds.maxImag).toBeCloseTo(1.0);
    });

    it('should translate viewport down when deltaY is positive', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Pan 100 pixels down
      viewport.pan(0, 100, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Real bounds should remain unchanged
      expect(bounds.minReal).toBeCloseTo(-2.5);
      expect(bounds.maxReal).toBeCloseTo(1.0);
      
      // Moving down means we're looking at a region higher in the complex plane
      // So both minImag and maxImag should increase
      expect(bounds.minImag).toBeGreaterThan(-1.0);
      expect(bounds.maxImag).toBeGreaterThan(1.0);
      
      // The range should remain the same
      const newImagRange = bounds.maxImag - bounds.minImag;
      expect(newImagRange).toBeCloseTo(2.0); // original range: 1.0 - (-1.0) = 2.0
    });

    it('should translate viewport up when deltaY is negative', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Pan 100 pixels up
      viewport.pan(0, -100, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Real bounds should remain unchanged
      expect(bounds.minReal).toBeCloseTo(-2.5);
      expect(bounds.maxReal).toBeCloseTo(1.0);
      
      // Moving up means we're looking at a region lower in the complex plane
      // So both minImag and maxImag should decrease
      expect(bounds.minImag).toBeLessThan(-1.0);
      expect(bounds.maxImag).toBeLessThan(1.0);
    });

    it('should handle diagonal panning correctly', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      
      // Pan diagonally (right and down)
      viewport.pan(100, 100, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Both real and imaginary components should change
      expect(bounds.minReal).not.toBe(initialBounds.minReal);
      expect(bounds.minImag).not.toBe(initialBounds.minImag);
      
      // Ranges should remain constant
      const realRange = bounds.maxReal - bounds.minReal;
      const imagRange = bounds.maxImag - bounds.minImag;
      expect(realRange).toBeCloseTo(3.5);
      expect(imagRange).toBeCloseTo(2.0);
    });

    it('should pan proportionally to pixel delta', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      // Pan 200 pixels should move twice as far as 100 pixels
      const viewport1 = new ViewportManager({
        minReal: -2.5,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });
      
      const viewport2 = new ViewportManager({
        minReal: -2.5,
        maxReal: 1.0,
        minImag: -1.0,
        maxImag: 1.0
      });
      
      viewport1.pan(100, 0, canvasWidth, canvasHeight);
      viewport2.pan(200, 0, canvasWidth, canvasHeight);
      
      const bounds1 = viewport1.getBounds();
      const bounds2 = viewport2.getBounds();
      
      const delta1 = bounds1.minReal - (-2.5);
      const delta2 = bounds2.minReal - (-2.5);
      
      expect(delta2).toBeCloseTo(delta1 * 2);
    });

    it('should preserve viewport ranges after panning', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      const initialRealRange = initialBounds.maxReal - initialBounds.minReal;
      const initialImagRange = initialBounds.maxImag - initialBounds.minImag;
      
      // Pan in various directions
      viewport.pan(50, 30, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      const realRange = bounds.maxReal - bounds.minReal;
      const imagRange = bounds.maxImag - bounds.minImag;
      
      expect(realRange).toBeCloseTo(initialRealRange);
      expect(imagRange).toBeCloseTo(initialImagRange);
    });
  });

  describe('zoom', () => {
    it('should decrease viewport size when zooming in (zoomFactor > 1)', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      const initialRealRange = initialBounds.maxReal - initialBounds.minReal;
      const initialImagRange = initialBounds.maxImag - initialBounds.minImag;
      
      // Zoom in by factor of 2 at center
      viewport.zoom(2.0, 400, 300, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      const newRealRange = bounds.maxReal - bounds.minReal;
      const newImagRange = bounds.maxImag - bounds.minImag;
      
      // Viewport should be half the size
      expect(newRealRange).toBeCloseTo(initialRealRange / 2);
      expect(newImagRange).toBeCloseTo(initialImagRange / 2);
    });

    it('should increase viewport size when zooming out (zoomFactor < 1)', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      const initialRealRange = initialBounds.maxReal - initialBounds.minReal;
      const initialImagRange = initialBounds.maxImag - initialBounds.minImag;
      
      // Zoom out by factor of 0.5 at center
      viewport.zoom(0.5, 400, 300, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      const newRealRange = bounds.maxReal - bounds.minReal;
      const newImagRange = bounds.maxImag - bounds.minImag;
      
      // Viewport should be twice the size
      expect(newRealRange).toBeCloseTo(initialRealRange * 2);
      expect(newImagRange).toBeCloseTo(initialImagRange * 2);
    });

    it('should preserve focal point coordinate when zooming', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const focalX = 400;
      const focalY = 300;
      
      // Get focal point before zoom
      const focalBefore = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Zoom in at focal point
      viewport.zoom(2.0, focalX, focalY, canvasWidth, canvasHeight);
      
      // Get focal point after zoom
      const focalAfter = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Focal point should remain at the same complex plane coordinate
      expect(focalAfter.real).toBeCloseTo(focalBefore.real);
      expect(focalAfter.imag).toBeCloseTo(focalBefore.imag);
    });

    it('should preserve focal point at non-center location', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const focalX = 200; // Left of center
      const focalY = 150; // Top of center
      
      // Get focal point before zoom
      const focalBefore = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Zoom in at focal point
      viewport.zoom(3.0, focalX, focalY, canvasWidth, canvasHeight);
      
      // Get focal point after zoom
      const focalAfter = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Focal point should remain at the same complex plane coordinate
      expect(focalAfter.real).toBeCloseTo(focalBefore.real);
      expect(focalAfter.imag).toBeCloseTo(focalBefore.imag);
    });

    it('should preserve aspect ratio when zooming', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      const initialRealRange = initialBounds.maxReal - initialBounds.minReal;
      const initialImagRange = initialBounds.maxImag - initialBounds.minImag;
      const initialAspectRatio = initialRealRange / initialImagRange;
      
      // Zoom in at center
      viewport.zoom(2.5, 400, 300, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      const newRealRange = bounds.maxReal - bounds.minReal;
      const newImagRange = bounds.maxImag - bounds.minImag;
      const newAspectRatio = newRealRange / newImagRange;
      
      // Aspect ratio should remain constant
      expect(newAspectRatio).toBeCloseTo(initialAspectRatio);
    });

    it('should handle multiple zoom operations correctly', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      const initialRealRange = initialBounds.maxReal - initialBounds.minReal;
      
      // Zoom in twice
      viewport.zoom(2.0, 400, 300, canvasWidth, canvasHeight);
      viewport.zoom(2.0, 400, 300, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      const newRealRange = bounds.maxReal - bounds.minReal;
      
      // Should be 1/4 of original size (2 * 2)
      expect(newRealRange).toBeCloseTo(initialRealRange / 4);
    });

    it('should handle zoom in followed by zoom out', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      
      const initialBounds = viewport.getBounds();
      
      // Zoom in then zoom out by same factor at center
      viewport.zoom(2.0, 400, 300, canvasWidth, canvasHeight);
      viewport.zoom(0.5, 400, 300, canvasWidth, canvasHeight);
      
      const bounds = viewport.getBounds();
      
      // Should return to approximately original bounds
      expect(bounds.minReal).toBeCloseTo(initialBounds.minReal);
      expect(bounds.maxReal).toBeCloseTo(initialBounds.maxReal);
      expect(bounds.minImag).toBeCloseTo(initialBounds.minImag);
      expect(bounds.maxImag).toBeCloseTo(initialBounds.maxImag);
    });

    it('should zoom around corner focal point correctly', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const focalX = 0; // Top-left corner
      const focalY = 0;
      
      // Get focal point before zoom
      const focalBefore = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Zoom in at corner
      viewport.zoom(2.0, focalX, focalY, canvasWidth, canvasHeight);
      
      // Get focal point after zoom
      const focalAfter = viewport.canvasToComplex(focalX, focalY, canvasWidth, canvasHeight);
      
      // Focal point should remain at the same complex plane coordinate
      expect(focalAfter.real).toBeCloseTo(focalBefore.real);
      expect(focalAfter.imag).toBeCloseTo(focalBefore.imag);
    });
  });
});
