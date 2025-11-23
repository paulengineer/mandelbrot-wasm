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
 * Module object that matches the WebAssembly module interface
 * This allows the JavaScript calculator to be used interchangeably with WASM modules
 */
export default {
  calculatePoint,
  calculate_point: calculatePoint  // Alias for Rust-style naming
};
