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

The module exports a single function:

### `calculatePoint(real, imag, maxIterations, escapeRadius)`

Calculates the number of iterations for a point in the Mandelbrot set.

**Parameters:**
- `real` (float64): Real component of the complex number c
- `imag` (float64): Imaginary component of the complex number c
- `maxIterations` (uint32): Maximum number of iterations to perform
- `escapeRadius` (float64): Threshold beyond which a point is considered escaped

**Returns:**
- (uint32): The number of iterations before escape, or maxIterations if the point doesn't escape

## Usage from JavaScript

```javascript
// Load the Go WASM module
const go = new Go();
const result = await WebAssembly.instantiateStreaming(
  fetch('mandelbrot.wasm'),
  go.importObject
);
go.run(result.instance);

// Call the function
const iterations = calculatePoint(0.0, 0.0, 100, 2.0);
```

Note: You'll need to include the `wasm_exec.js` file from the Go installation to use the `Go` class.

## Output

- `mandelbrot.wasm`: The compiled WebAssembly module
