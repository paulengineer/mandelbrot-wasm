use wasm_bindgen::prelude::*;

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
#[wasm_bindgen]
pub fn calculate_point(real: f64, imag: f64, max_iterations: u32, escape_radius: f64) -> u32 {
    let c_real = real;
    let c_imag = imag;
    
    let mut z_real = 0.0;
    let mut z_imag = 0.0;
    
    let escape_radius_squared = escape_radius * escape_radius;
    
    for iteration in 0..max_iterations {
        // Calculate |z|^2 = z_real^2 + z_imag^2
        let z_magnitude_squared = z_real * z_real + z_imag * z_imag;
        
        // Check if point has escaped
        if z_magnitude_squared > escape_radius_squared {
            return iteration;
        }
        
        // Calculate z = z^2 + c
        // (a + bi)^2 = a^2 - b^2 + 2abi
        let z_real_temp = z_real * z_real - z_imag * z_imag + c_real;
        z_imag = 2.0 * z_real * z_imag + c_imag;
        z_real = z_real_temp;
    }
    
    // Point did not escape within max_iterations
    max_iterations
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_point_in_set() {
        // Point (0, 0) is in the Mandelbrot set
        let iterations = calculate_point(0.0, 0.0, 100, 2.0);
        assert_eq!(iterations, 100);
    }

    #[test]
    fn test_point_escapes_quickly() {
        // Point (2, 2) escapes very quickly
        let iterations = calculate_point(2.0, 2.0, 100, 2.0);
        assert!(iterations < 10);
    }

    #[test]
    fn test_iteration_bounded() {
        // Any point should return iterations <= max_iterations
        let max_iter = 256;
        let iterations = calculate_point(-0.5, 0.5, max_iter, 2.0);
        assert!(iterations <= max_iter);
    }
}
