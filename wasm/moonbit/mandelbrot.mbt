/// Calculate the number of iterations for a point in the Mandelbrot set
/// 
/// # Arguments
/// * `real` - Real component of the complex number c
/// * `imag` - Imaginary component of the complex number c
/// * `max_iterations` - Maximum number of iterations to perform
/// * `escape_radius` - Threshold beyond which a point is considered escaped
/// 
/// # Returns
/// The number of iterations before escape, or max_iterations if the point doesn't escape
pub fn calculatePoint(real : Double, imag : Double, max_iterations : Int, escape_radius : Double) -> Int {
  let c_real = real
  let c_imag = imag
  
  let mut z_real = 0.0
  let mut z_imag = 0.0
  
  let escape_radius_squared = escape_radius * escape_radius
  
  for iteration = 0; iteration < max_iterations; iteration = iteration + 1 {
    // Calculate |z|^2 = z_real^2 + z_imag^2
    let z_magnitude_squared = z_real * z_real + z_imag * z_imag
    
    // Check if point has escaped
    if z_magnitude_squared > escape_radius_squared {
      return iteration
    }
    
    // Calculate z = z^2 + c
    // (a + bi)^2 = a^2 - b^2 + 2abi
    let z_real_temp = z_real * z_real - z_imag * z_imag + c_real
    z_imag = 2.0 * z_real * z_imag + c_imag
    z_real = z_real_temp
  }
  
  // Point did not escape within max_iterations
  max_iterations
}

// Main function required for wasm build
fn main {
  // Call the function once to ensure it's included in the binary
  let _ = calculatePoint(0.0, 0.0, 100, 2.0)
}
