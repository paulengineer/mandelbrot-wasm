# Go WebAssembly Module for Mandelbrot Calculation

This directory contains the Go implementation of the Mandelbrot set calculation function.

## Prerequisites

You need either:
- **TinyGo** (recommended for smaller WASM output): https://tinygo.org/getting-started/install/
- **Go** (standard compiler, larger output): https://go.dev/doc/install

## Building

### With TinyGo (Recommended)

```bash
tinygo build -o mandelbrot.wasm -target wasm mandelbrot.go
```

### With Standard Go

```bash
GOOS=js GOARCH=wasm go build -o mandelbrot.wasm mandelbrot.go
```

### Using npm script

```bash
npm run build:go
```

The npm script will try TinyGo first, then fall back to standard Go if TinyGo is not available.

## Installation

### TinyGo Installation (Ubuntu/Debian)

```bash
wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_amd64.deb
sudo dpkg -i tinygo_0.30.0_amd64.deb
```

### Go Installation (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install golang-go
```

## Interface

The module exports two functions:

### `calculatePoint(real, imag, maxIterations, escapeRadius)`

Calculates the number of iterations for a single point in the Mandelbrot set.

**Parameters:**
- `real` (float64): Real component of the complex number c
- `imag` (float64): Imaginary component of the complex number c
- `maxIterations` (uint32): Maximum number of iterations to perform
- `escapeRadius` (float64): Threshold beyond which a point is considered escaped

**Returns:**
- (uint32): The number of iterations before escape, or maxIterations if the point doesn't escape

### `calculateMandelbrotSet(realCoords, imagCoords, maxIterations, escapeRadius)`

Calculates the Mandelbrot set for multiple points in a single batch call.

**Parameters:**
- `realCoords` (array of float64): Array of real components for all points
- `imagCoords` (array of float64): Array of imaginary components for all points
- `maxIterations` (uint32): Maximum number of iterations to perform
- `escapeRadius` (float64): Threshold beyond which a point is considered escaped

**Returns:**
- (array of uint32): Array of iteration counts, one for each input coordinate pair

## Usage from JavaScript

```javascript
// Load the Go WASM module
const go = new Go();
const result = await WebAssembly.instantiateStreaming(
  fetch('mandelbrot.wasm'),
  go.importObject
);
go.run(result.instance);

// Call the single-point function
const iterations = calculatePoint(0.0, 0.0, 100, 2.0);

// Call the batch function
const realCoords = [0.0, -0.5, 0.25];
const imagCoords = [0.0, 0.0, 0.0];
const results = calculateMandelbrotSet(realCoords, imagCoords, 100, 2.0);
// results is an array: [100, 100, 3]
```

Note: You'll need to include the `wasm_exec.js` file from the Go installation to use the `Go` class.

## Output

- `mandelbrot.wasm`: The compiled WebAssembly module
