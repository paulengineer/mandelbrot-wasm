# Design Document: Mandelbrot Visualizer

## Overview

The Mandelbrot Visualizer is a high-performance web application that renders the Mandelbrot set fractal with real-time pan and zoom interactions. The system architecture separates concerns between the presentation layer (HTML/JavaScript), the computation engine (WebAssembly), and the rendering pipeline (Canvas API).

The application follows a request-render cycle where user interactions update viewport parameters, trigger WebAssembly calculations for each pixel, and render the results to a full-screen canvas. Performance is achieved through WebAssembly's near-native execution speed and efficient memory sharing between JavaScript and Wasm.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Window                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │              HTML5 Canvas (Full Screen)           │  │
│  │  ┌──────────────────────┐                         │  │
│  │  │  Module Selector UI  │                         │  │
│  │  │  [Rust|C++|Go]       │                         │  │
│  │  └──────────────────────┘                         │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │     Rendered Mandelbrot Set              │    │  │
│  │  │                                          │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │                                │
│  ┌──────────────────────┴──────────────────────────┐    │
│  │         JavaScript Application Layer            │    │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────┐     │    │
│  │  │  Event     │  │ Viewport │  │ Render  │     │    │
│  │  │  Handler   │→ │ Manager  │→ │ Engine  │     │    │
│  │  └────────────┘  └──────────┘  └────┬────┘     │    │
│  │  ┌────────────┐                      │          │    │
│  │  │  Module    │──────────────────────┘          │    │
│  │  │  Selector  │                                 │    │
│  │  └────────────┘                                 │    │
│  └─────────────────────────┬────────────────────────┘   │
│                            │                             │
│  ┌─────────────────────────▼───────────────────┐        │
│  │    WebAssembly Computation Modules          │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │        │
│  │  │   Rust   │  │   C++    │  │    Go    │  │        │
│  │  │  Module  │  │  Module  │  │  Module  │  │        │
│  │  └──────────┘  └──────────┘  └──────────┘  │        │
│  │  All expose same calculation interface      │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Initialization**: Page loads → Fetch and instantiate default Wasm module → Initialize canvas → Render module selector UI → Render initial view
2. **User Interaction**: Mouse/wheel event → Event handler updates viewport → Trigger render
3. **Module Selection**: User selects module → Load new Wasm module → Preserve viewport → Re-render with new module
4. **Render Cycle**: Viewport parameters → Wasm calculation for each pixel → Color mapping → Canvas draw

## Components and Interfaces

### 1. HTML/CSS Layer

**Responsibility**: Provide the full-screen canvas element and basic page structure.

**Interface**:
- Single HTML page with a `<canvas>` element
- CSS styling to ensure canvas fills viewport (width: 100vw, height: 100vh)
- Responsive to window resize events

### 2. JavaScript Application Layer

#### 2.1 Event Handler

**Responsibility**: Capture and process user input events (mouse drag, wheel scroll).

**Interface**:
```javascript
class EventHandler {
  constructor(canvas, viewportManager)
  
  // Mouse event handlers
  onMouseDown(event)
  onMouseMove(event)
  onMouseUp(event)
  
  // Wheel event handler
  onWheel(event)
}
```

**Behavior**:
- Tracks mouse state (pressed/released, position)
- Calculates delta movements for panning
- Calculates zoom factor and focal point from wheel events
- Delegates viewport updates to ViewportManager

#### 2.2 Viewport Manager

**Responsibility**: Maintain and update the current view into the complex plane.

**Interface**:
```javascript
class ViewportManager {
  constructor(initialBounds)
  
  // Get current viewport bounds
  getBounds() // Returns { minReal, maxReal, minImag, maxImag }
  
  // Update viewport for panning
  pan(deltaX, deltaY, canvasWidth, canvasHeight)
  
  // Update viewport for zooming
  zoom(zoomFactor, focalX, focalY, canvasWidth, canvasHeight)
  
  // Convert canvas coordinates to complex plane coordinates
  canvasToComplex(canvasX, canvasY, canvasWidth, canvasHeight)
}
```

**Behavior**:
- Stores current viewport boundaries in complex plane coordinates
- Translates pixel deltas to complex plane deltas for panning
- Scales viewport around focal point for zooming
- Maintains aspect ratio during transformations

#### 2.3 Render Engine

**Responsibility**: Orchestrate the calculation and rendering of the Mandelbrot set.

**Interface**:
```javascript
class RenderEngine {
  constructor(canvas, wasmModule, viewportManager)
  
  // Trigger a full render
  render()
  
  // Map iteration count to color
  iterationToColor(iterations, maxIterations)
  
  // Switch to a different Wasm module
  setWasmModule(newModule)
}
```

**Behavior**:
- Iterates over each pixel in the canvas
- Converts pixel coordinates to complex plane coordinates
- Calls Wasm calculation function for each point
- Maps iteration results to colors
- Draws pixels to canvas using ImageData API
- Supports hot-swapping Wasm modules while preserving viewport state

### 3. WebAssembly Computation Modules

**Responsibility**: Perform high-performance Mandelbrot set calculations using different source languages.

**Multiple Module Support**: The system supports three WebAssembly modules compiled from different source languages:
- Rust implementation
- C/C++ implementation  
- Go implementation

All modules expose the same interface for interoperability.

**Interface** (exposed to JavaScript):
```javascript
// Wasm exports (consistent across all modules)
{
  // Calculate iterations for a single point
  calculatePoint(real, imag, maxIterations, escapeRadius) // Returns iteration count
  
  // Calculate iterations for a buffer of points (optional optimization)
  calculateBuffer(bufferPtr, length, maxIterations, escapeRadius)
}
```

**Implementation** (Rust/C++/Go):
- Iterative calculation: z = z² + c
- Early exit when |z| > escapeRadius
- Return iteration count or maxIterations

**Memory Management**:
- Use shared memory between JavaScript and Wasm for buffer-based calculations
- JavaScript allocates and passes memory pointers to Wasm

### 4. Module Selector UI Component

**Responsibility**: Provide user interface for selecting between available WebAssembly modules.

**Interface**:
```javascript
class ModuleSelector {
  constructor(availableModules, onModuleChange)
  
  // Get currently selected module
  getCurrentModule()
  
  // Change active module
  selectModule(moduleName)
  
  // Render selector UI
  render()
}
```

**Behavior**:
- Displays as an overlay control on the canvas
- Shows available modules (Rust, C/C++, Go)
- Highlights currently selected module
- Triggers module reload and re-render when selection changes
- Preserves current viewport when switching modules

## Data Models

### Viewport

Represents the current view into the complex plane.

```javascript
{
  minReal: number,    // Minimum real component (left edge)
  maxReal: number,    // Maximum real component (right edge)
  minImag: number,    // Minimum imaginary component (bottom edge)
  maxImag: number     // Maximum imaginary component (top edge)
}
```

**Initial Values**:
- minReal: -2.5
- maxReal: 1.0
- minImag: -1.0
- maxImag: 1.0

### Calculation Parameters

Configuration for Mandelbrot calculations.

```javascript
{
  maxIterations: number,    // Maximum iteration count (e.g., 256, 512, 1000)
  escapeRadius: number      // Escape threshold (typically 2.0)
}
```

### Color Palette

Mapping from iteration counts to RGB colors.

```javascript
{
  palette: Array<{r: number, g: number, b: number}>,  // Pre-computed color array
  setColor: {r: number, g: number, b: number}         // Color for points in the set
}
```

**Color Mapping Strategy**:
- Use smooth color gradients (e.g., HSV to RGB conversion)
- Map iteration count to palette index
- Apply continuous coloring to avoid banding: `smoothed = iterations + 1 - log(log(|z|)) / log(2)`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas dimensions match viewport on resize

*For any* window resize event, the canvas width and height should equal the new viewport width and height respectively.

**Validates: Requirements 1.2**

### Property 2: Iteration count bounded by maximum

*For any* complex point and calculation parameters, the returned iteration count should be less than or equal to maxIterations.

**Validates: Requirements 2.2**

### Property 3: Escape detection accuracy

*For any* complex point that escapes, if we manually iterate the Mandelbrot function, the point should exceed the escape radius at exactly the returned iteration count.

**Validates: Requirements 2.3**

### Property 4: Non-escaping points return maximum iterations

*For any* complex point that does not escape within maxIterations, the calculation function should return exactly maxIterations.

**Validates: Requirements 2.4**

### Property 5: Pan translates viewport proportionally

*For any* viewport and mouse movement delta, panning should translate the viewport boundaries by a distance in the complex plane that is proportional to the pixel delta and the current viewport scale.

**Validates: Requirements 3.2**

### Property 6: Zoom direction affects viewport size correctly

*For any* viewport, zooming in (positive zoom factor) should decrease the viewport size, and zooming out (negative zoom factor) should increase the viewport size.

**Validates: Requirements 4.1, 4.2**

### Property 7: Zoom preserves focal point

*For any* viewport and cursor position, the complex plane coordinate at the cursor position should remain unchanged after a zoom operation.

**Validates: Requirements 4.3**

### Property 8: Zoom preserves aspect ratio

*For any* viewport and zoom factor, the aspect ratio (width/height) of the viewport should remain constant before and after the zoom operation.

**Validates: Requirements 4.4**

### Property 9: Iteration count maps to valid color

*For any* iteration count between 0 and maxIterations, the color mapping function should return a valid RGB color object with r, g, b values in the range [0, 255].

**Validates: Requirements 6.1**

### Property 10: Maximum iterations map to set color

*For any* point where the iteration count equals maxIterations, the color mapping function should return the designated set color (typically black).

**Validates: Requirements 6.2**

### Property 11: Module switch preserves viewport

*For any* viewport state and WebAssembly module change, the viewport boundaries should remain unchanged after switching modules.

**Validates: Requirements 5.6**

## Error Handling

### WebAssembly Loading Errors

**Scenario**: Wasm module fails to fetch or instantiate.

**Handling**:
- Display user-friendly error message on the canvas
- Log detailed error to console for debugging
- Prevent render attempts until module is loaded
- If switching modules, fall back to previously working module

**Implementation**:
```javascript
try {
  const wasmModule = await loadWasmModule(moduleName);
} catch (error) {
  displayError(`Failed to load ${moduleName} calculation engine. Please try another module.`);
  console.error("Wasm loading error:", error);
  // Fall back to previous module if switching
  if (previousModule) {
    return previousModule;
  }
  return;
}
```

### Invalid Viewport State

**Scenario**: Viewport boundaries become invalid (e.g., minReal >= maxReal).

**Handling**:
- Validate viewport after each transformation
- Clamp zoom to prevent viewport collapse
- Reset to default viewport if state becomes corrupted

**Implementation**:
- Minimum viewport size: 1e-10 in complex plane units
- Maximum zoom level: prevent viewport smaller than minimum

### Canvas Context Errors

**Scenario**: Unable to get 2D rendering context from canvas.

**Handling**:
- Display error message
- Gracefully degrade or suggest browser upgrade

### Calculation Overflow

**Scenario**: Complex number calculations produce NaN or Infinity.

**Handling**:
- Wasm module checks for overflow conditions
- Return maxIterations for overflow cases
- Ensure escape radius check prevents most overflow scenarios

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**Canvas Initialization**:
- Test that canvas is created with correct initial dimensions
- Test that initial viewport matches specification (-2.5 to 1.0 real, -1.0 to 1.0 imaginary)
- Test that default Wasm module is loaded before first render
- Test that module selector UI is present on page load
- Test that default module is selected in the UI

**Event Handling**:
- Test mousedown initiates pan mode
- Test mouseup completes pan and triggers render
- Test wheel event triggers zoom
- Test that render is called after viewport changes

**Module Selection**:
- Test that all three modules (Rust, C/C++, Go) are available in selector
- Test that selecting a module triggers module load
- Test that module switch triggers re-render
- Test that failed module load displays error and falls back

**Coordinate Conversion**:
- Test canvas-to-complex coordinate conversion with known values
- Test edge cases (0,0), (width, height), (width/2, height/2)

**Color Mapping**:
- Test that maxIterations maps to set color
- Test that 0 iterations maps to first palette color
- Test that mid-range iterations map to appropriate palette colors

**Error Handling**:
- Test Wasm load failure displays error message
- Test invalid viewport state is handled gracefully

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs using a PBT library (fast-check for JavaScript, or proptest if testing Rust Wasm code).

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with the format:
`// Feature: mandelbrot-visualizer, Property {number}: {property_text}`

**Properties to Test**:

1. **Canvas Resize Property** (Property 1)
   - Generate random viewport dimensions
   - Verify canvas dimensions match after resize

2. **Iteration Bound Property** (Property 2)
   - Generate random complex points and maxIterations values
   - Verify returned iterations ≤ maxIterations

3. **Escape Detection Property** (Property 3)
   - Generate random escaping points
   - Verify manual iteration matches returned count

4. **Non-Escape Property** (Property 4)
   - Generate random non-escaping points (known to be in set)
   - Verify returned iterations === maxIterations

5. **Pan Translation Property** (Property 5)
   - Generate random viewports and pan deltas
   - Verify viewport translates proportionally

6. **Zoom Direction Property** (Property 6)
   - Generate random viewports and zoom factors
   - Verify zoom in decreases size, zoom out increases size

7. **Zoom Focal Point Property** (Property 7)
   - Generate random viewports, cursor positions, and zoom factors
   - Verify focal point coordinate remains constant

8. **Zoom Aspect Ratio Property** (Property 8)
   - Generate random viewports and zoom factors
   - Verify aspect ratio unchanged

9. **Color Validity Property** (Property 9)
   - Generate random iteration counts
   - Verify color values in valid range [0, 255]

10. **Set Color Property** (Property 10)
    - Test with maxIterations value
    - Verify returns designated set color

11. **Module Switch Viewport Preservation** (Property 11)
    - Generate random viewport states
    - Switch between random modules
    - Verify viewport boundaries unchanged

### Integration Testing

- Test complete render cycle: user interaction → viewport update → calculation → rendering
- Test pan and zoom in sequence to verify state consistency
- Test rapid interactions to ensure no race conditions
- Test module switching during active rendering
- Test that all three Wasm modules produce equivalent results for the same input

### Performance Testing

While not part of automated correctness testing, performance should be manually validated:
- Render time for initial view should be < 1 second
- Pan and zoom should feel responsive (< 100ms to start render)
- Deep zoom levels should maintain acceptable performance

## Implementation Notes

### Technology Choices

**WebAssembly Source Languages**: Multiple implementations for performance comparison
- **Rust**: Memory safety and excellent Wasm tooling (wasm-pack, wasm-bindgen)
- **C/C++**: Mature compilers and optimization (Emscripten)
- **Go**: Simplicity and built-in Wasm support (TinyGo for smaller binaries)

**JavaScript Framework**: Vanilla JavaScript (no framework needed)
- Simple application doesn't require React/Vue overhead
- Direct DOM and Canvas API access for maximum performance

**Build Tools**:
- Rust: wasm-pack for building Wasm modules
- C/C++: Emscripten for compilation to Wasm
- Go: TinyGo for optimized Wasm output
- JavaScript: Simple bundler (Vite, Parcel) or no bundler for development
- Static file server for testing

### Performance Optimizations

**Calculation Optimizations**:
- Use escape radius of 2.0 (standard for Mandelbrot)
- Implement early bailout when |z| > escape radius
- Consider adaptive iteration counts based on zoom level

**Rendering Optimizations**:
- Use ImageData API for batch pixel updates
- Consider Web Workers for parallel calculation (future enhancement)
- Implement progressive rendering for deep zooms (future enhancement)

**Memory Management**:
- Reuse ImageData buffer across renders
- Minimize allocations in hot paths
- Use typed arrays for efficient data transfer

### Browser Compatibility

**Minimum Requirements**:
- WebAssembly support (all modern browsers since 2017)
- HTML5 Canvas support
- ES6 JavaScript support

**Tested Browsers**:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+

### File Structure

```
mandelbrot-visualizer/
├── index.html              # Main HTML page
├── styles.css              # Canvas and page styling
├── src/
│   ├── main.js            # Application entry point
│   ├── eventHandler.js    # Mouse/wheel event handling
│   ├── viewportManager.js # Viewport state management
│   ├── renderEngine.js    # Rendering orchestration
│   ├── colorPalette.js    # Color mapping functions
│   ├── wasmLoader.js      # Wasm module loading
│   └── moduleSelector.js  # Module selection UI component
├── wasm/
│   ├── rust/
│   │   ├── src/
│   │   │   └── lib.rs     # Rust source for Wasm module
│   │   ├── Cargo.toml     # Rust project configuration
│   │   └── pkg/           # Built Rust Wasm output
│   ├── cpp/
│   │   ├── mandelbrot.cpp # C++ source for Wasm module
│   │   └── build/         # Built C++ Wasm output
│   └── go/
│       ├── mandelbrot.go  # Go source for Wasm module
│       └── build/         # Built Go Wasm output
└── tests/
    ├── unit/              # Unit tests
    └── property/          # Property-based tests
```
