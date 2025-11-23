import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventHandler } from '../../src/eventHandler.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('EventHandler - Zoom', () => {
  let canvas;
  let viewportManager;
  let mockRenderEngine;
  let eventHandler;

  beforeEach(() => {
    // Create a mock canvas with event listener support
    const realCanvas = createCanvas(800, 600);
    canvas = {
      ...realCanvas,
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    
    // Create viewport manager
    viewportManager = new ViewportManager({
      minReal: -2.0,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });
    
    // Create mock render engine
    mockRenderEngine = {
      render: vi.fn(),
      scaleCanvas: vi.fn(),
      canvas: canvas
    };
    
    // Create event handler
    eventHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
  });

  describe('zooming', () => {
    it('should call zoom on viewport manager when wheel event occurs', () => {
      const zoomSpy = vi.spyOn(viewportManager, 'zoom');
      
      // Create wheel event (scroll up to zoom in)
      // Note: offsetX/offsetY need to be set as properties, not in constructor
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
      
      eventHandler.onWheel(wheelEvent);
      
      // Zoom should be called with calculated zoom factor and focal point
      expect(zoomSpy).toHaveBeenCalledWith(
        expect.any(Number), // zoom factor
        400, // focalX
        300, // focalY
        800, // canvas width
        600  // canvas height
      );
    });

    it('should trigger debounced render after zoom', async () => {
      mockRenderEngine.render.mockClear();
      
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
      
      eventHandler.onWheel(wheelEvent);
      
      // Render should not be called immediately (debounced)
      expect(mockRenderEngine.render).not.toHaveBeenCalled();
      
      // Wait for debounce delay (1000ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Now render should have been called
      expect(mockRenderEngine.render).toHaveBeenCalled();
    });

    it('should calculate zoom factor > 1 for negative deltaY (zoom in)', () => {
      const zoomSpy = vi.spyOn(viewportManager, 'zoom');
      
      // Negative deltaY means scrolling up (zoom in)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
      
      eventHandler.onWheel(wheelEvent);
      
      const zoomFactor = zoomSpy.mock.calls[0][0];
      expect(zoomFactor).toBeGreaterThan(1);
    });

    it('should calculate zoom factor < 1 for positive deltaY (zoom out)', () => {
      const zoomSpy = vi.spyOn(viewportManager, 'zoom');
      
      // Positive deltaY means scrolling down (zoom out)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 300 });
      
      eventHandler.onWheel(wheelEvent);
      
      const zoomFactor = zoomSpy.mock.calls[0][0];
      expect(zoomFactor).toBeLessThan(1);
    });

    it('should use cursor position as focal point', () => {
      const zoomSpy = vi.spyOn(viewportManager, 'zoom');
      
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent, 'offsetX', { value: 250 });
      Object.defineProperty(wheelEvent, 'offsetY', { value: 450 });
      
      eventHandler.onWheel(wheelEvent);
      
      // Check that focal point matches cursor position
      expect(zoomSpy).toHaveBeenCalledWith(
        expect.any(Number),
        250, // focalX should match offsetX
        450, // focalY should match offsetY
        800,
        600
      );
    });

    it('should handle multiple zoom events', () => {
      const zoomSpy = vi.spyOn(viewportManager, 'zoom');
      
      // First zoom
      const wheelEvent1 = new WheelEvent('wheel', {
        deltaY: -100
      });
      Object.defineProperty(wheelEvent1, 'offsetX', { value: 400 });
      Object.defineProperty(wheelEvent1, 'offsetY', { value: 300 });
      eventHandler.onWheel(wheelEvent1);
      
      // Second zoom
      const wheelEvent2 = new WheelEvent('wheel', {
        deltaY: 100
      });
      Object.defineProperty(wheelEvent2, 'offsetX', { value: 500 });
      Object.defineProperty(wheelEvent2, 'offsetY', { value: 400 });
      eventHandler.onWheel(wheelEvent2);
      
      expect(zoomSpy).toHaveBeenCalledTimes(2);
    });

    it('should attach wheel event listener during initialization', () => {
      const addEventListenerSpy = vi.spyOn(canvas, 'addEventListener');
      
      // Create a new event handler to test listener attachment
      const newHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
      
      // Should attach wheel listener
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    it('should remove wheel event listener when detached', () => {
      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener');
      
      eventHandler.detachEventListeners();
      
      // Should remove wheel listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
  });
});
