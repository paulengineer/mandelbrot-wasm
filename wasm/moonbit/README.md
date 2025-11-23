# Moonbit WebAssembly Module

This directory contains the Moonbit implementation of the Mandelbrot set calculation.

## Building

To build the WebAssembly module:

```bash
moon build --target wasm
cp target/wasm/release/build/mandelbrot.wasm build/
```

## Interface

The module exports a single function:

- `calculatePoint(real: Double, imag: Double, max_iterations: Int, escape_radius: Double) -> Int`

This function calculates the number of iterations before a point escapes the Mandelbrot set, or returns `max_iterations` if the point doesn't escape.

## Requirements

- Moonbit compiler (moon) installed
- Target: WebAssembly (wasm)
