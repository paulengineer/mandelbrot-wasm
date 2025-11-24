# Go WebAssembly Implementation

## Overview

This is the Go implementation of the Mandelbrot set calculation function. It provides the same interface as the Rust and C++ implementations.

## Implementation Details

### Function: `calculatePoint`

The function implements the Mandelbrot set iteration algorithm:

1. **Initialization**: Start with z = 0 + 0i
2. **Iteration**: For each iteration up to maxIterations:
   - Calculate |z|² = z_real² + z_imag²
   - If |z|² > escapeRadius², return current iteration count
   - Calculate z = z² + c (where c is the input complex number)
3. **Result**: If no escape occurs, return maxIterations

### Algorithm

The complex number squaring is computed as:
- (a + bi)² = a² - b² + 2abi

This is implemented as:
```go
zRealTemp := zReal*zReal - zImag*zImag + cReal
zImag = 2.0*zReal*zImag + cImag
zReal = zRealTemp
```

### JavaScript Interface

Two functions are exposed to JavaScript via the `syscall/js` package:

#### Single Point Calculation

```javascript
calculatePoint(real, imag, maxIterations, escapeRadius)
```

**Parameters:**
- `real` (float64): Real component of complex number c
- `imag` (float64): Imaginary component of complex number c  
- `maxIterations` (uint32): Maximum iterations before considering point in set
- `escapeRadius` (float64): Threshold for escape detection (typically 2.0)

**Returns:**
- (uint32): Iteration count at escape, or maxIterations if no escape

#### Batch Calculation

```javascript
calculateMandelbrotSet(realCoords, imagCoords, maxIterations, escapeRadius)
```

**Parameters:**
- `realCoords` (array of float64): Array of real components for all points
- `imagCoords` (array of float64): Array of imaginary components for all points
- `maxIterations` (uint32): Maximum iterations before considering point in set
- `escapeRadius` (float64): Threshold for escape detection (typically 2.0)

**Returns:**
- (array of uint32): Array of iteration counts, one for each input coordinate pair

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 2.1**: Executes computation using WebAssembly with batch processing
- **Requirement 2.2**: Iterates up to maximum iteration count
- **Requirement 2.3**: Returns iteration count when point escapes
- **Requirement 2.4**: Returns maxIterations for non-escaping points
- **Requirement 2.5**: Passes memory buffers efficiently between JavaScript and WebAssembly
- **Requirement 2.6**: Returns results as an array from batch calculation
- **Requirement 5.1**: Compiled from Go source to Wasm format

## Build Information

- **Compiler**: Standard Go compiler (GOOS=js GOARCH=wasm)
- **Output Size**: ~1.8MB (includes Go runtime)
- **Alternative**: TinyGo can produce smaller output (~10-50KB)

## Correctness Properties

The implementation upholds these correctness properties:

1. **Property 2**: Iteration count is always ≤ maxIterations
2. **Property 3**: Escape detection is accurate (point exceeds escape radius at returned iteration)
3. **Property 4**: Non-escaping points return exactly maxIterations

## Performance Characteristics

- **Execution Speed**: Near-native performance via WebAssembly
- **Memory Usage**: Minimal per-calculation (only local variables)
- **Binary Size**: Larger than Rust/C++ due to Go runtime inclusion

## Usage Notes

When loading this module in JavaScript, you need to:

1. Include the `wasm_exec.js` helper from Go installation
2. Create a `Go` instance
3. Instantiate and run the WebAssembly module
4. Call the globally registered `calculatePoint` function

See `README.md` for detailed usage examples.
