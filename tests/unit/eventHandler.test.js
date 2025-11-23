import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventHandler } from '../../src/eventHandler.js';
import { ViewportManager } from '../../src/viewportManager.js';
import { createCanvas } from 'canvas';

describe('EventHandler', () => {
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
      minReal: -2.5,
      maxReal: 1.0,
      minImag: -1.0,
      maxImag: 1.0
    });
    
    // Create mock render engine
    mockRenderEngine = {
      render: vi.fn(),
      canvas: canvas
    };
    
    // Create event handler
    eventHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
  });

  describe('initialization', () => {
    it('should initialize with canvas, viewport manager, and render engine', () => {
      expect(eventHandler.canvas).toBe(canvas);
      expect(eventHandler.viewportManager).toBe(viewportManager);
      expect(eventHandler.renderEngine).toBe(mockRenderEngine);
    });

    it('should initialize with panning disabled', () => {
      expect(eventHandler.isPanningActive()).toBe(false);
    });

    it('should attach event listeners to canvas', () => {
      const addEventListenerSpy = vi.spyOn(canvas, 'addEventListener');
      
      // Create a new event handler to test listener attachment
      const newHandler = new EventHandler(canvas, viewportManager, mockRenderEngine);
      
      // Should attach mousedown, mousemove, and mouseup listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });

  describe('panning', () => {
    it('should initiate pan mode on left mouse button down', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      });
      
      eventHandler.onMouseDown(mouseDownEvent);
      
      expect(eventHandler.isPanningActive()).toBe(true);
    });

    it('should not initiate pan mode on right mouse button', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2, // Right button
        clientX: 400,
        clientY: 300
      });
      
      eventHandler.onMouseDown(mouseDownEvent);
      
      expect(eventHandler.isPanningActive()).toBe(false);
    });

    it('should store initial mouse position on mouse down', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      });
      
      eventHandler.onMouseDown(mouseDownEvent);
      
      expect(eventHandler.lastMouseX).toBe(400);
      expect(eventHandler.lastMouseY).toBe(300);
    });

    it('should update viewport when mouse moves during pan', () => {
      const panSpy = vi.spyOn(viewportManager, 'pan');
      
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // Move mouse
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 450,
        clientY: 350
      }));
      
      // Pan should be called with the deltas (ViewportManager handles the direction)
      expect(panSpy).toHaveBeenCalledWith(50, 50, 800, 600);
    });

    it('should trigger render during mouse move', () => {
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // Move mouse
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 450,
        clientY: 350
      }));
      
      // Render should be called
      expect(mockRenderEngine.render).toHaveBeenCalled();
    });

    it('should not update viewport when mouse moves without panning', () => {
      const panSpy = vi.spyOn(viewportManager, 'pan');
      
      // Move mouse without starting pan
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 450,
        clientY: 350
      }));
      
      // Pan should not be called
      expect(panSpy).not.toHaveBeenCalled();
    });

    it('should complete pan operation on mouse up', () => {
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      expect(eventHandler.isPanningActive()).toBe(true);
      
      // Release mouse
      eventHandler.onMouseUp(new MouseEvent('mouseup', {
        button: 0
      }));
      
      expect(eventHandler.isPanningActive()).toBe(false);
    });

    it('should trigger render on mouse up', () => {
      mockRenderEngine.render.mockClear();
      
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // Release mouse
      eventHandler.onMouseUp(new MouseEvent('mouseup', {
        button: 0
      }));
      
      // Render should be called
      expect(mockRenderEngine.render).toHaveBeenCalled();
    });

    it('should handle multiple mouse move events during pan', () => {
      const panSpy = vi.spyOn(viewportManager, 'pan');
      
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // Move mouse multiple times
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 410,
        clientY: 310
      }));
      
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 420,
        clientY: 320
      }));
      
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 430,
        clientY: 330
      }));
      
      // Pan should be called three times
      expect(panSpy).toHaveBeenCalledTimes(3);
    });

    it('should update last mouse position after each move', () => {
      // Start panning
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // Move mouse
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 450,
        clientY: 350
      }));
      
      expect(eventHandler.lastMouseX).toBe(450);
      expect(eventHandler.lastMouseY).toBe(350);
    });

    it('should calculate correct deltas for subsequent moves', () => {
      const panSpy = vi.spyOn(viewportManager, 'pan');
      
      // Start panning at (400, 300)
      eventHandler.onMouseDown(new MouseEvent('mousedown', {
        button: 0,
        clientX: 400,
        clientY: 300
      }));
      
      // First move to (450, 350) - delta should be (50, 50)
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 450,
        clientY: 350
      }));
      
      expect(panSpy).toHaveBeenLastCalledWith(50, 50, 800, 600);
      
      // Second move to (460, 360) - delta should be (10, 10) from last position
      eventHandler.onMouseMove(new MouseEvent('mousemove', {
        clientX: 460,
        clientY: 360
      }));
      
      expect(panSpy).toHaveBeenLastCalledWith(10, 10, 800, 600);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners when detached', () => {
      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener');
      const documentRemoveSpy = vi.spyOn(document, 'removeEventListener');
      
      eventHandler.detachEventListeners();
      
      // Should remove mousedown, mousemove, and mouseup listeners from canvas
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      
      // Should remove mouseup listener from document
      expect(documentRemoveSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });
});
