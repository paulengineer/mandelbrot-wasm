/**
 * WebAssembly Module Loader
 * 
 * Handles loading and instantiation of Mandelbrot calculation modules
 * from different source languages (Rust, C++, Go).
 */

/**
 * Module configuration for each WebAssembly implementation
 */
const MODULE_CONFIGS = {
  rust: {
    name: 'Rust',
    path: '/wasm/rust/pkg/mandelbrot_wasm_rust.js',
    wasmPath: '/wasm/rust/pkg/mandelbrot_wasm_rust_bg.wasm',
    type: 'esm', // ES module with init function
    functionName: 'calculate_point'
  },
  cpp: {
    name: 'C++',
    path: '/wasm/cpp/mandelbrot.js',
    wasmPath: '/wasm/cpp/mandelbrot.wasm',
    type: 'emscripten', // Emscripten module
    functionName: 'calculatePoint'
  },
  go: {
    name: 'Go',
    path: '/wasm/go/mandelbrot.wasm',
    wasmPath: '/wasm/go/mandelbrot.wasm',
    type: 'go', // TinyGo/Go wasm
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
 * @returns {Promise<Object>} Module instance with calculatePoint function
 */
async function loadRustModule(config) {
  try {
    // Dynamically import the Rust wasm-bindgen generated module
    const wasmModule = await import(config.path);
    
    // Initialize the WebAssembly module
    await wasmModule.default();
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return wasmModule.calculate_point(real, imag, maxIterations, escapeRadius);
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
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return instance._calculatePoint(real, imag, maxIterations, escapeRadius);
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
      // For TinyGo, we need to provide minimal Go runtime support
      // This is a simplified version - in production, you'd load wasm_exec.js
      throw new Error('Go WebAssembly runtime not available. Please ensure wasm_exec.js is loaded.');
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
    
    // Return wrapper with standardized interface
    return {
      calculatePoint: (real, imag, maxIterations, escapeRadius) => {
        return globalThis.calculatePoint(real, imag, maxIterations, escapeRadius);
      },
      name: config.name,
      type: 'go'
    };
  } catch (error) {
    throw new Error(`Failed to load Go module: ${error.message}`);
  }
}

/**
 * Load a WebAssembly module by name
 * @param {string} moduleName - Name of the module to load ('rust', 'cpp', or 'go')
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
      default:
        throw new Error(`Unknown module type: ${config.type}`);
    }
    
    // Verify the module exposes the required function
    if (typeof module.calculatePoint !== 'function') {
      throw new Error(`Module ${config.name} does not expose calculatePoint function`);
    }
    
    console.log(`Successfully loaded ${config.name} WebAssembly module`);
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
