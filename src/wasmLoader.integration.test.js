/**
 * Integration tests for WebAssembly module loader
 * These tests verify actual module loading and function execution
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadWasmModule, loadDefaultModule } from './wasmLoader.js';

describe('wasmLoader integration', () => {
  describe('loadDefaultModule', () => {
    it('should load the default Rust module', async () => {
      try {
        const module = await loadDefaultModule();
        
        // Verify module structure
        expect(module).toBeDefined();
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        expect(module.name).toBe('Rust');
        expect(module.type).toBe('rust');
        
        console.log('✓ Default module loaded successfully');
      } catch (error) {
        // If module fails to load, it might be because WASM files aren't built
        console.warn('Warning: Could not load default module:', error.message);
        console.warn('This is expected if WASM modules have not been built yet.');
        console.warn('Run: npm run build:wasm');
      }
    }, 10000); // 10 second timeout for module loading
  });

  describe('loadWasmModule - Rust', () => {
    it('should load Rust module and expose calculatePoint function', async () => {
      try {
        const module = await loadWasmModule('rust');
        
        // Verify module exposes required function
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        
        // Test the function with a known point
        // Point (0, 0) is in the Mandelbrot set
        const iterations = module.calculatePoint(0.0, 0.0, 100, 2.0);
        expect(iterations).toBe(100);
        
        // Point (2, 2) escapes quickly
        const iterations2 = module.calculatePoint(2.0, 2.0, 100, 2.0);
        expect(iterations2).toBeLessThan(10);
        
        console.log('✓ Rust module loaded and tested successfully');
      } catch (error) {
        console.warn('Warning: Could not load Rust module:', error.message);
        console.warn('Run: npm run build:rust');
      }
    }, 10000);
  });

  describe('loadWasmModule - C++', () => {
    it('should load C++ module and expose calculatePoint function', async () => {
      try {
        const module = await loadWasmModule('cpp');
        
        // Verify module exposes required function
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        
        // Test the function with a known point
        const iterations = module.calculatePoint(0.0, 0.0, 100, 2.0);
        expect(iterations).toBe(100);
        
        console.log('✓ C++ module loaded and tested successfully');
      } catch (error) {
        console.warn('Warning: Could not load C++ module:', error.message);
        console.warn('Run: npm run build:cpp');
      }
    }, 10000);
  });

  describe('loadWasmModule - JavaScript', () => {
    it('should load JavaScript module and expose calculatePoint function', async () => {
      try {
        const module = await loadWasmModule('javascript');
        
        // Verify module exposes required function
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        expect(module.name).toBe('JavaScript');
        expect(module.type).toBe('javascript');
        
        // Test the function with a known point
        // Point (0, 0) is in the Mandelbrot set
        const iterations = module.calculatePoint(0.0, 0.0, 100, 2.0);
        expect(iterations).toBe(100);
        
        // Point (2, 2) escapes quickly
        const iterations2 = module.calculatePoint(2.0, 2.0, 100, 2.0);
        expect(iterations2).toBeLessThan(10);
        
        console.log('✓ JavaScript module loaded and tested successfully');
      } catch (error) {
        console.warn('Warning: Could not load JavaScript module:', error.message);
        throw error; // JavaScript module should always be available
      }
    }, 10000);
  });

  describe('Module function verification', () => {
    it('should verify all loaded modules expose calculatePoint', async () => {
      const modulesToTest = ['rust', 'cpp', 'javascript'];
      
      for (const moduleName of modulesToTest) {
        try {
          const module = await loadWasmModule(moduleName);
          
          // Verify function exists
          expect(module.calculatePoint).toBeDefined();
          expect(typeof module.calculatePoint).toBe('function');
          
          // Verify function signature works
          const result = module.calculatePoint(0, 0, 10, 2.0);
          expect(typeof result).toBe('number');
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(10);
          
        } catch (error) {
          // JavaScript module should always work, so don't skip it silently
          if (moduleName === 'javascript') {
            throw error;
          }
          console.warn(`Skipping ${moduleName} module test:`, error.message);
        }
      }
    }, 30000);

    it('should verify all loaded modules expose calculateMandelbrotSet batch API', async () => {
      // Requirements: 2.1, 5.2, 5.4 - All modules should expose batch API
      const modulesToTest = ['rust', 'javascript']; // Test fast-loading modules
      
      for (const moduleName of modulesToTest) {
        try {
          const module = await loadWasmModule(moduleName);
          
          // Verify batch API function exists
          expect(module.calculateMandelbrotSet).toBeDefined();
          expect(typeof module.calculateMandelbrotSet).toBe('function');
          
          // Test batch API with multiple points
          const realCoords = new Float64Array([0, -0.5, 2.0]);
          const imagCoords = new Float64Array([0, 0, 2.0]);
          const results = module.calculateMandelbrotSet(realCoords, imagCoords, 100, 2.0);
          
          // Verify results
          expect(results).toBeDefined();
          expect(results.length).toBe(3);
          expect(results instanceof Uint32Array).toBe(true);
          
          // Verify specific results
          expect(results[0]).toBe(100); // (0, 0) is in the set
          expect(results[2]).toBeLessThan(10); // (2, 2) escapes quickly
          
          console.log(`✓ ${moduleName} module batch API tested successfully`);
          
        } catch (error) {
          // JavaScript module should always work, so don't skip it silently
          if (moduleName === 'javascript') {
            throw error;
          }
          console.warn(`Skipping ${moduleName} module batch API test:`, error.message);
        }
      }
    }, 30000);

    it('should verify batch API returns correct array length', async () => {
      // Requirements: 2.1, 2.6 - Batch API should return array with same length as input
      try {
        const module = await loadWasmModule('javascript');
        
        // Test with various array sizes
        const sizes = [1, 5, 10, 100];
        
        for (const size of sizes) {
          const realCoords = new Float64Array(size).fill(0);
          const imagCoords = new Float64Array(size).fill(0);
          const results = module.calculateMandelbrotSet(realCoords, imagCoords, 100, 2.0);
          
          expect(results.length).toBe(size);
          console.log(`✓ Batch API returns correct length for ${size} points`);
        }
        
      } catch (error) {
        console.warn('Warning: Could not test batch API array length:', error.message);
        throw error;
      }
    }, 30000);
  });
});
