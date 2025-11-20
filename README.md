# Mandelbrot Visualizer

Interactive Mandelbrot set visualizer using WebAssembly with multiple language implementations (Rust, C++, Go).

## Prerequisites

- Node.js (v18 or higher)
- Rust and wasm-pack: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
- Emscripten for C++: https://emscripten.org/docs/getting_started/downloads.html
- TinyGo for Go: https://tinygo.org/getting-started/install/

## Installation

```bash
npm install
```

## Building WebAssembly Modules

Build all modules:
```bash
npm run build:wasm
```

Or build individually:
```bash
npm run build:rust
npm run build:cpp
npm run build:go
```

## Development

Start the development server:
```bash
npm run dev
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Building for Production

```bash
npm run build
```

## Project Structure

```
.
├── index.html              # Main HTML page
├── styles.css              # Canvas and page styling
├── src/                    # JavaScript source files
├── wasm/                   # WebAssembly modules
│   ├── rust/              # Rust implementation
│   ├── cpp/               # C++ implementation
│   └── go/                # Go implementation
└── tests/                  # Test files
    ├── unit/              # Unit tests
    └── property/          # Property-based tests
```
