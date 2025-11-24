/**
 * JavaScript implementation of Mandelbrot set calculation
 * Provides the same interface as WebAssembly modules for performance comparison
 */

/**
 * Calculate the number of iterations for a point in the Mandelbrot set
 * 
 * @param {number} real - Real component of the complex number c
 * @param {number} imag - Imaginary component of the complex number c
 * @param {number} maxIterations - Maximum number of iterations to perform
 * @param {number} escapeRadius - Threshold beyond which a point is considered escaped
 * @returns {number} The number of iterations before escape, or maxIterations if the point doesn't escape
 */
export function calculatePoint(real, imag, maxIterations, escapeRadius) {
  const cReal = real;
  const cImag = imag;
  
  let zReal = 0.0;
  let zImag = 0.0;
  
  const escapeRadiusSquared = escapeRadius * escapeRadius;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Calculate |z|^2 = z_real^2 + z_imag^2
    const zMagnitudeSquared = zReal * zReal + zImag * zImag;
    
    // Check if point has escaped
    if (zMagnitudeSquared > escapeRadiusSquared) {
      return iteration;
    }
    
    // Calculate z = z^2 + c
    // (a + bi)^2 = a^2 - b^2 + 2abi
    const zRealTemp = zReal * zReal - zImag * zImag + cReal;
    zImag = 2.0 * zReal * zImag + cImag;
    zReal = zRealTemp;
  }
  
  // Point did not escape within maxIterations
  return maxIterations;
}

/**
 * Calculate the Mandelbrot set for multiple points in a single batch call
 * 
 * @param {Float64Array|Array<number>} realCoords - Array of real components for all points
 * @param {Float64Array|Array<number>} imagCoords - Array of imaginary components for all points
 * @param {number} maxIterations - Maximum number of iterations to perform
 * @param {number} escapeRadius - Threshold beyond which a point is considered escaped
 * @returns {Uint32Array} Array of iteration counts, one for each input coordinate pair
 */
export function calculateMandelbrotSet(realCoords, imagCoords, maxIterations, escapeRadius) {
  // Ensure input arrays have the same length
  const length = Math.min(realCoords.length, imagCoords.length);
  
  // Pre-allocate result array
  const results = new Uint32Array(length);
  
  const escapeRadiusSquared = escapeRadius * escapeRadius;
  
  // Process each coordinate pair
  for (let i = 0; i < length; i++) {
    const cReal = realCoords[i];
    const cImag = imagCoords[i];
    
    let zReal = 0.0;
    let zImag = 0.0;
    
    let iteration = 0;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate |z|^2 = z_real^2 + z_imag^2
      const zMagnitudeSquared = zReal * zReal + zImag * zImag;
      
      // Check if point has escaped
      if (zMagnitudeSquared > escapeRadiusSquared) {
        iteration = iter;
        break;
      }
      
      // Calculate z = z^2 + c
      // (a + bi)^2 = a^2 - b^2 + 2abi
      const zRealTemp = zReal * zReal - zImag * zImag + cReal;
      zImag = 2.0 * zReal * zImag + cImag;
      zReal = zRealTemp;
      
      iteration = iter + 1;
    }
    
    results[i] = iteration;
  }
  
  return results;
}

/**
 * Module object that matches the WebAssembly module interface
 * This allows the JavaScript calculator to be used interchangeably with WASM modules
 */
export default {
  calculatePoint,
  calculate_point: calculatePoint,  // Alias for Rust-style naming
  calculateMandelbrotSet,
  calculate_mandelbrot_set: calculateMandelbrotSet  // Alias for Rust-style naming
};
