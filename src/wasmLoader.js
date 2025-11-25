/**
 * WebAssembly Module Loader
 * 
 * Handles loading and instantiation of Mandelbrot calculation modules
 * from different source languages (Rust, C++, Go).
 */

/**
 * Module configuration for each WebAssembly implementation and JavaScript
 */
const MODULE_CONFIGS = {
  rust: {
    name: 'Rust',
    path: import.meta.env.BASE_URL + 'wasm/rust/mandelbrot_wasm_rust.js',
    wasmPath: import.meta.env.BASE_URL + 'wasm/rust/mandelbrot_wasm_rust_bg.wasm',
    type: 'esm', // ES module with init function
    functionName: 'calculate_point'
  },
  cpp: {
    name: 'C++',
    path: import.meta.env.BASE_URL + 'wasm/cpp/mandelbrot.js',
    wasmPath: import.meta.env.BASE_URL + 'wasm/cpp/mandelbrot.wasm',
    type: 'emscripten', // Emscripten module
    functionName: 'calculatePoint'
  },
  go: {
    name: 'Go',
    path: import.meta.env.BASE_URL + 'wasm/go/wasm_exec.js',
    wasmPath: import.meta.env.BASE_URL + 'wasm/go/mandelbrot.wasm',
    type: 'go', // TinyGo/Go wasm
    functionName: 'calculatePoint'
  },
  moonbit: {
    name: 'Moonbit',
    wasmPath: import.meta.env.BASE_URL + 'wasm/moonbit/build/mandelbrot.wasm',
    type: 'moonbit', // Moonbit wasm
    functionName: 'calculatePoint'
  },
  javascript: {
    name: 'JavaScript',
    path: import.meta.env.BASE_URL + 'src/jsCalculator.js',
    type: 'javascript', // Pure JavaScript implementation
    functionName: 'calculatePoint'
  }
};

/**
 * Default module to load on initialization
 */
const DEFAULT_MODULE = 'rust';

/**
 * Load and instantiate a Rust WebAssembly module
 * @param {Object} config - Module configuration
 * @returns {Promise<Object>} Module instance with calculatePoint and calculateMandelbrotSet functions
 */
async function loadRustModule(config) {
  try {
    console.log('import.meta.env.BASE_URL: ' + import.meta.env.BASE_URL)
    // Dynamically import the Rust wasm-bindgen generated module
    const wasmModule = await import(config.path);
    
    // Initialize the WebAssembly module
    await wasmModule.default();
    
    // Verify the point calculation function exists
    if (!wasmModule.calculate_point) {
      throw new Error('calculate_point function not found in Rust module');
    }
    
    // Verify batch API function exists
    if (!wasmModule.calculate_mandelbrot_set) {
      throw new Error('calculate_mandelbrot_set (batch API) function not found in Rust module');
    }
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return wasmModule.calculate_point(real, imag, maxIterations, escapeRadius);
      },
      calculateMandelbrotSet: (realCoords, imagCoords, maxIterations, escapeRadius) => {
        // Call the batch calculation function
        const results = wasmModule.calculate_mandelbrot_set(
          realCoords,
          imagCoords,
          maxIterations,
          escapeRadius
        );
        
        // Convert result to Uint32Array if needed
        return results instanceof Uint32Array ? results : new Uint32Array(results);
      },
      name: config.name,
      type: 'rust'
    };
  } catch (error) {
    throw new Error(`Failed to load Rust module: ${error.message}`);
  }
}

/**
 * Load and instantiate a C++ (Emscripten) WebAssembly module
 * @param {Object} config - Module configuration
 * @returns {Promise<Object>} Module instance with calculatePoint function
 */
async function loadCppModule(config) {
  try {
    // Dynamically import the Emscripten generated module
    const EmscriptenModule = await import(config.path);
    
    // Initialize the Emscripten module
    const instance = await EmscriptenModule.default();
    
    // Verify the function exists
    if (!instance._calculatePoint) {
      throw new Error('calculatePoint function not found in C++ module');
    }
    
    // Verify batch API function exists
    if (!instance._calculateMandelbrotSet) {
      throw new Error('calculateMandelbrotSet function not found in C++ module');
    }
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return instance._calculatePoint(real, imag, maxIterations, escapeRadius);
      },
      calculateMandelbrotSet: (realCoords, imagCoords, maxIterations, escapeRadius) => {
        const length = Math.min(realCoords.length, imagCoords.length);
        
        // Allocate memory for input arrays in WASM heap
        const realPtr = instance._malloc(length * 8); // 8 bytes per double
        const imagPtr = instance._malloc(length * 8);
        
        // Copy data to WASM heap
        instance.HEAPF64.set(realCoords, realPtr / 8);
        instance.HEAPF64.set(imagCoords, imagPtr / 8);
        
        // Call the batch calculation function
        const resultsPtr = instance._calculateMandelbrotSet(
          realPtr,
          imagPtr,
          length,
          maxIterations,
          escapeRadius
        );
        
        // Free input arrays
        instance._free(realPtr);
        instance._free(imagPtr);
        
        if (!resultsPtr) {
          throw new Error('Failed to allocate memory for results in C++ module');
        }
        
        // Copy results from WASM heap to JavaScript array
        const results = new Uint32Array(length);
        for (let i = 0; i < length; i++) {
          results[i] = instance.HEAPU32[resultsPtr / 4 + i];
        }
        
        // Free results array
        instance._freeResults(resultsPtr);
        
        return results;
      },
      name: config.name,
      type: 'cpp'
    };
  } catch (error) {
    throw new Error(`Failed to load C++ module: ${error.message}`);
  }
}

/**
 * Load and instantiate a Go (TinyGo) WebAssembly module
 * @param {Object} config - Module configuration
 * @returns {Promise<Object>} Module instance with calculatePoint function
 */
async function loadGoModule(config) {
  try {
    // Load the Go Wasm exec helper if not already loaded
    if (!globalThis.Go) {
      // Dynamically load wasm_exec.js
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = config.path;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${config.path}`));
        document.head.appendChild(script);
      });
    }
    
    // Fetch the WebAssembly binary
    const response = await fetch(config.wasmPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch Go module: ${response.status} ${response.statusText}`);
    }
    
    const wasmBytes = await response.arrayBuffer();
    
    // Create a new Go instance
    const go = new Go();
    
    // Instantiate the WebAssembly module
    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
    
    // Run the Go program (this registers the calculatePoint function)
    go.run(result.instance);
    
    // Wait a bit for the Go runtime to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the function exists
    if (!globalThis.calculatePoint) {
      throw new Error('calculatePoint function not found in Go module');
    }
    
    // Verify batch API function exists
    if (!globalThis.calculateMandelbrotSet) {
      throw new Error('calculateMandelbrotSet function not found in Go module');
    }
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return globalThis.calculatePoint(real, imag, maxIterations, escapeRadius);
      },
      calculateMandelbrotSet: (realCoords, imagCoords, maxIterations, escapeRadius) => {
        // Convert typed arrays to regular arrays for Go
        const realArray = Array.from(realCoords);
        const imagArray = Array.from(imagCoords);
        
        // Call the batch calculation function
        const results = globalThis.calculateMandelbrotSet(realArray, imagArray, maxIterations, escapeRadius);
        
        // Convert result to Uint32Array
        return new Uint32Array(results);
      },
      name: config.name,
      type: 'go'
    };
  } catch (error) {
    throw new Error(`Failed to load Go module: ${error.message}`);
  }
}

/**
 * Load and instantiate a Moonbit WebAssembly module
 * @param {Object} config - Module configuration
 * @returns {Promise<Object>} Module instance with calculatePoint and calculateMandelbrotSet functions
 */
async function loadMoonbitModule(config) {
  try {
    // Fetch the WebAssembly binary
    const response = await fetch(config.wasmPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch Moonbit module: ${response.status} ${response.statusText}`);
    }
    
    const wasmBytes = await response.arrayBuffer();
    
    // Instantiate the WebAssembly module with minimal imports
    const result = await WebAssembly.instantiate(wasmBytes, {
      spectest: {
        print_i32: (x) => console.log(x),
        print_f64: (x) => console.log(x)
      }
    });
    
    // Verify the point calculation function exists
    if (!result.instance.exports.calculatePoint) {
      throw new Error('calculatePoint function not found in Moonbit module');
    }
    
    // Check if batch API function exists (may not be implemented yet)
    const hasBatchAPI = !!result.instance.exports.calculateMandelbrotSet;
    
    if (!hasBatchAPI) {
      console.warn('calculateMandelbrotSet (batch API) function not found in Moonbit module - falling back to per-pixel calculation');
    }
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return result.instance.exports.calculatePoint(real, imag, maxIterations, escapeRadius);
      },
      calculateMandelbrotSet: hasBatchAPI 
        ? (realCoords, imagCoords, maxIterations, escapeRadius) => {
            // Use native batch API if available
            const results = result.instance.exports.calculateMandelbrotSet(
              realCoords,
              imagCoords,
              maxIterations,
              escapeRadius
            );
            return results instanceof Uint32Array ? results : new Uint32Array(results);
          }
        : (realCoords, imagCoords, maxIterations, escapeRadius) => {
            // Fallback: calculate each point individually
            const length = Math.min(realCoords.length, imagCoords.length);
            const results = new Uint32Array(length);
            for (let i = 0; i < length; i++) {
              results[i] = result.instance.exports.calculatePoint(
                realCoords[i],
                imagCoords[i],
                maxIterations,
                escapeRadius
              );
            }
            return results;
          },
      name: config.name,
      type: 'moonbit',
      hasBatchAPI
    };
  } catch (error) {
    throw new Error(`Failed to load Moonbit module: ${error.message}`);
  }
}

/**
 * Load a JavaScript calculation module
 * @param {Object} config - Module configuration
 * @returns {Promise<Object>} Module instance with calculatePoint and calculateMandelbrotSet functions
 */
async function loadJavaScriptModule(config) {
  try {
    // Dynamically import the JavaScript calculator module
    const jsModule = await import(config.path);
    
    // Verify the point calculation function exists
    if (!jsModule.calculatePoint) {
      throw new Error('calculatePoint function not found in JavaScript module');
    }
    
    // Verify batch API function exists
    if (!jsModule.calculateMandelbrotSet) {
      throw new Error('calculateMandelbrotSet (batch API) function not found in JavaScript module');
    }
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return jsModule.calculatePoint(real, imag, maxIterations, escapeRadius);
      },
      calculateMandelbrotSet: (realCoords, imagCoords, maxIterations, escapeRadius) => {
        // Call the batch calculation function
        const results = jsModule.calculateMandelbrotSet(
          realCoords,
          imagCoords,
          maxIterations,
          escapeRadius
        );
        
        // Ensure result is Uint32Array
        return results instanceof Uint32Array ? results : new Uint32Array(results);
      },
      name: config.name,
      type: 'javascript'
    };
  } catch (error) {
    throw new Error(`Failed to load JavaScript module: ${error.message}`);
  }
}

/**
 * Load a WebAssembly or JavaScript module by name
 * @param {string} moduleName - Name of the module to load ('rust', 'cpp', 'go', or 'javascript')
 * @returns {Promise<Object>} Module instance with calculatePoint function
 * @throws {Error} If module name is invalid or loading fails
 */
export async function loadWasmModule(moduleName) {
  // Validate module name
  if (!MODULE_CONFIGS[moduleName]) {
    throw new Error(`Invalid module name: ${moduleName}. Valid options are: ${Object.keys(MODULE_CONFIGS).join(', ')}`);
  }
  
  const config = MODULE_CONFIGS[moduleName];
  
  try {
    let module;
    
    // Load module based on type
    switch (config.type) {
      case 'esm':
        module = await loadRustModule(config);
        break;
      case 'emscripten':
        module = await loadCppModule(config);
        break;
      case 'go':
        module = await loadGoModule(config);
        break;
      case 'moonbit':
        module = await loadMoonbitModule(config);
        break;
      case 'javascript':
        module = await loadJavaScriptModule(config);
        break;
      default:
        throw new Error(`Unknown module type: ${config.type}`);
    }
    
    // Verify the module exposes the required functions
    if (typeof module.calculatePoint !== 'function') {
      throw new Error(`Module ${config.name} does not expose calculatePoint function`);
    }
    
    if (typeof module.calculateMandelbrotSet !== 'function') {
      throw new Error(`Module ${config.name} does not expose calculateMandelbrotSet (batch API) function`);
    }
    
    console.log(`Successfully loaded ${config.name} module with batch API support`);
    return module;
    
  } catch (error) {
    console.error(`Error loading ${config.name} module:`, error);
    throw error;
  }
}

/**
 * Load the default WebAssembly module
 * @returns {Promise<Object>} Default module instance
 */
export async function loadDefaultModule() {
  return loadWasmModule(DEFAULT_MODULE);
}

/**
 * Get list of available module names
 * @returns {Array<string>} Array of available module names
 */
export function getAvailableModules() {
  return Object.keys(MODULE_CONFIGS);
}

/**
 * Get the default module name
 * @returns {string} Default module name
 */
export function getDefaultModuleName() {
  return DEFAULT_MODULE;
}

/**
 * Get module configuration
 * @param {string} moduleName - Name of the module
 * @returns {Object} Module configuration
 */
export function getModuleConfig(moduleName) {
  return MODULE_CONFIGS[moduleName];
}
