# Project Structure

## Root Directory

```
.
├── .git/              # Git repository metadata
├── .gitattributes     # Git file handling rules (LF normalization)
├── .gitignore         # Git ignore patterns
├── .kiro/             # Kiro AI assistant configuration
│   ├── specs/         # Feature specifications
│   └── steering/      # AI guidance documents
├── index.html         # Main HTML page
├── styles.css         # Canvas and page styling
├── package.json       # Node.js dependencies and scripts
├── vite.config.js     # Vite build configuration
├── README.md          # Project documentation
├── src/               # JavaScript source files
├── wasm/              # WebAssembly modules
│   ├── rust/          # Rust implementation
│   │   ├── src/       # Rust source code
│   │   ├── Cargo.toml # Rust project configuration
│   │   └── pkg/       # Built Rust Wasm output (generated)
│   ├── cpp/           # C++ implementation
│   │   └── build/     # Built C++ Wasm output (generated)
│   └── go/            # Go implementation
│       └── build/     # Built Go Wasm output (generated)
└── tests/             # Test files
    ├── unit/          # Unit tests
    └── property/      # Property-based tests
```

## Organization Principles

- Separation of concerns: HTML/CSS, JavaScript source, WebAssembly modules, and tests
- Multiple WebAssembly implementations for performance comparison
- Build outputs are gitignored and generated during build process

## File Conventions

- Text files use LF (Unix-style) line endings (enforced via .gitattributes)
- Git LFS is configured for large file handling
- ES6 modules for JavaScript
- WebAssembly modules expose consistent interfaces

## Key Directories

- **src/**: JavaScript application layer (event handling, viewport management, rendering)
- **wasm/**: WebAssembly computation modules in Rust, C++, and Go
- **tests/**: Unit and property-based tests
