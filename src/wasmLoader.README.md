# WebAssembly Module Loader

The `wasmLoader.js` module provides a unified interface for loading and using Mandelbrot calculation WebAssembly modules compiled from different source languages (Rust, C++, Go).

## Features

- **Multi-language support**: Load WASM modules from Rust, C++, or Go
- **Unified interface**: All modules expose the same `calculatePoint` function
- **Error handling**: Comprehensive error handling for failed loads
- **Function verification**: Automatically verifies modules expose required functions
- **Default module**: Rust module is loaded by default

## Usage

### Basic Usage

```javascript
import { loadDefaultModule } from './wasmLoader.js';

// Load the default module (Rust)
const module = await loadDefaultModule();

// Calculate iterations for a point
const iterations = module.calculatePoint(
  -0.5,  // real component
  0.0,   // imaginary component
  256,   // max iterations
  2.0    // escape radius
);
```

### Loading Specific Modules

```javascript
import { loadWasmModule } from './wasmLoader.js';

// Load Rust module
const rustModule = await loadWasmModule('rust');

// Load C++ module
const cppModule = await loadWasmModule('cpp');

// Load Go module
const goModule = await loadWasmModule('go');
```

### Getting Available Modules

```javascript
import { getAvailableModules, getDefaultModuleName } from './wasmLoader.js';

// Get list of available modules
const modules = getAvailableModules();
console.log(modules); // ['rust', 'cpp', 'go']

// Get default module name
const defaultModule = getDefaultModuleName();
console.log(defaultModule); // 'rust'
```

### Error Handling

```javascript
import { loadWasmModule } from './wasmLoader.js';

try {
  const module = await loadWasmModule('rust');
  // Use module...
} catch (error) {
  console.error('Failed to load module:', error.message);
  // Handle error (show message to user, fallback to another module, etc.)
}
```

## Module Interface

All loaded modules expose the following interface:

```javascript
{
  calculatePoint: (real, imag, maxIterations, escapeRadius) => number,
  name: string,  // e.g., 'Rust', 'C++', 'Go'
  type: string   // e.g., 'rust', 'cpp', 'go'
}
```

### calculatePoint Function

Calculates the number of iterations for a point in the Mandelbrot set.

**Parameters:**
- `real` (number): Real component of the complex number c
- `imag` (number): Imaginary component of the complex number c
- `maxIterations` (number): Maximum number of iterations to perform
- `escapeRadius` (number): Threshold beyond which a point is considered escaped (typically 2.0)

**Returns:**
- (number): The number of iterations before escape, or maxIterations if the point doesn't escape

**Example:**
```javascript
// Point (0, 0) is in the Mandelbrot set
const iterations = module.calculatePoint(0.0, 0.0, 100, 2.0);
// Returns: 100 (did not escape)

// Point (2, 2) escapes quickly
const iterations2 = module.calculatePoint(2.0, 2.0, 100, 2.0);
// Returns: < 10 (escaped quickly)
```

## Building WASM Modules

Before using the loader, ensure the WebAssembly modules are built:

```bash
# Build all modules
npm run build:wasm

# Or build individually
npm run build:rust
npm run build:cpp
npm run build:go
```

## Testing

Run the unit tests:

```bash
npm test -- src/wasmLoader.test.js
```

Run the integration tests (requires built WASM modules):

```bash
npm test -- src/wasmLoader.integration.test.js
```

Test in browser:

```bash
npm run dev
# Open test-loader.html in browser
```

## Module Paths

The loader expects modules at the following paths:

- **Rust**: `/wasm/rust/pkg/mandelbrot_wasm_rust.js`
- **C++**: `/wasm/cpp/mandelbrot.js`
- **Go**: `/wasm/go/mandelbrot.wasm`

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 2.5**: System passes viewport coordinates and iteration parameters to WASM module
- **Requirement 5.2**: System fetches and instantiates default WebAssembly module before rendering
- **Requirement 5.3**: System displays error message when Wasm module fails to load
- **Requirement 5.4**: System exposes calculation functions to JavaScript when Wasm module is instantiated

## Notes

- The Go module requires the Go WebAssembly runtime (`wasm_exec.js`) to be loaded
- All modules implement the same calculation algorithm for consistency
- Module loading is asynchronous and returns a Promise
- The loader verifies that loaded modules expose the required `calculatePoint` function
