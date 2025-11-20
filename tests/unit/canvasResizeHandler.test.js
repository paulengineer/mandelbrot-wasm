import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasResizeHandler } from '../../src/canvasResizeHandler.js';
import { createCanvas } from 'canvas';

describe('CanvasResizeHandler', () => {
  let canvas;
  let mockRenderEngine;
  let resizeHandler;

  beforeEach(() => {
    // Create a canvas using the canvas package
    canvas = createCanvas(800, 600);
    
    // Create a mock render engine
    mockRenderEngine = {
      render: vi.fn()
    };
    
    // Mock window.innerWidth and window.innerHeight
    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  describe('initialization', () => {
    it('should initialize with canvas and render engine', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      expect(resizeHandler.canvas).toBe(canvas);
      expect(resizeHandler.renderEngine).toBe(mockRenderEngine);
    });

    it('should set initial canvas size to match viewport', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('should attach window resize event listener', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('updateCanvasSize', () => {
    it('should update canvas dimensions to match viewport', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      // Change viewport size
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      
      resizeHandler.updateCanvasSize();
      
      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });

    it('should update canvas style dimensions when style exists', () => {
      // Add style property to canvas for this test
      canvas.style = {};
      
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      window.innerWidth = 1280;
      window.innerHeight = 720;
      
      resizeHandler.updateCanvasSize();
      
      expect(canvas.style.width).toBe('1280px');
      expect(canvas.style.height).toBe('720px');
    });
  });

  describe('onResize', () => {
    it('should update canvas size when resize event occurs', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      // Change viewport size
      window.innerWidth = 1600;
      window.innerHeight = 900;
      
      resizeHandler.onResize();
      
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(900);
    });

    it('should trigger re-render after resize', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      // Clear any calls from initialization
      mockRenderEngine.render.mockClear();
      
      resizeHandler.onResize();
      
      expect(mockRenderEngine.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCanvasDimensions', () => {
    it('should return current canvas dimensions', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      const dimensions = resizeHandler.getCanvasDimensions();
      
      expect(dimensions.width).toBe(canvas.width);
      expect(dimensions.height).toBe(canvas.height);
    });
  });

  describe('detachEventListener', () => {
    it('should remove window resize event listener', () => {
      resizeHandler = new CanvasResizeHandler(canvas, mockRenderEngine);
      
      resizeHandler.detachEventListener();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
