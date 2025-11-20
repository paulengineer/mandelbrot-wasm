import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('C++ WebAssembly Module', () => {
  let wasmModule;

  it('should load the C++ Wasm module', async () => {
    // Import the C++ module
    const Module = (await import('../../wasm/cpp/mandelbrot.js')).default;
    
    // Provide locateFile to help the module find the .wasm file
    wasmModule = await Module({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return join(__dirname, '../../wasm/cpp', path);
        }
        return path;
      }
    });
    
    expect(wasmModule).toBeDefined();
    expect(wasmModule._calculatePoint).toBeDefined();
  });

  it('should calculate point in the Mandelbrot set', async () => {
    // Import and initialize the module
    const Module = (await import('../../wasm/cpp/mandelbrot.js')).default;
    wasmModule = await Module({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return join(__dirname, '../../wasm/cpp', path);
        }
        return path;
      }
    });
    
    // Point (0, 0) is in the Mandelbrot set
    const iterations = wasmModule._calculatePoint(0.0, 0.0, 100, 2.0);
    expect(iterations).toBe(100);
  });

  it('should detect escaping points', async () => {
    // Import and initialize the module
    const Module = (await import('../../wasm/cpp/mandelbrot.js')).default;
    wasmModule = await Module({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return join(__dirname, '../../wasm/cpp', path);
        }
        return path;
      }
    });
    
    // Point (2, 2) escapes very quickly
    const iterations = wasmModule._calculatePoint(2.0, 2.0, 100, 2.0);
    expect(iterations).toBeLessThan(10);
  });

  it('should respect maximum iterations', async () => {
    // Import and initialize the module
    const Module = (await import('../../wasm/cpp/mandelbrot.js')).default;
    wasmModule = await Module({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return join(__dirname, '../../wasm/cpp', path);
        }
        return path;
      }
    });
    
    // Any point should return iterations <= max_iterations
    const maxIter = 256;
    const iterations = wasmModule._calculatePoint(-0.5, 0.5, maxIter, 2.0);
    expect(iterations).toBeLessThanOrEqual(maxIter);
  });

  it('should match Rust implementation for known points', async () => {
    // Import both modules
    const CppModule = (await import('../../wasm/cpp/mandelbrot.js')).default;
    const cppWasm = await CppModule({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return join(__dirname, '../../wasm/cpp', path);
        }
        return path;
      }
    });
    
    const RustModule = (await import('../../wasm/rust/pkg/mandelbrot_wasm_rust.js'));
    const wasmPath = join(__dirname, '../../wasm/rust/pkg/mandelbrot_wasm_rust_bg.wasm');
    const { readFile } = await import('fs/promises');
    const wasmBuffer = await readFile(wasmPath);
    await RustModule.default(wasmBuffer);
    
    // Test several known points
    const testPoints = [
      { real: 0.0, imag: 0.0 },
      { real: -1.0, imag: 0.0 },
      { real: 0.25, imag: 0.0 },
      { real: -0.5, imag: 0.5 },
      { real: 2.0, imag: 2.0 }
    ];
    
    const maxIter = 256;
    const escapeRadius = 2.0;
    
    for (const point of testPoints) {
      const cppResult = cppWasm._calculatePoint(point.real, point.imag, maxIter, escapeRadius);
      const rustResult = RustModule.calculate_point(point.real, point.imag, maxIter, escapeRadius);
      
      expect(cppResult).toBe(rustResult);
    }
  });
});
