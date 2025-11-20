# Technology Stack

## Version Control

- Git with LFS support enabled
- Line endings: Auto-normalized to LF (Unix-style)

## Development Environment

- Platform: Linux
- Shell: bash

## Common Commands

### Building

```bash
# Install dependencies
npm install

# Build all WebAssembly modules
npm run build:wasm

# Build individual modules
npm run build:rust
npm run build:cpp
npm run build:go

# Build for production
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Running

```bash
# Start development server
npm run dev

# Preview production build
npm run preview
```
