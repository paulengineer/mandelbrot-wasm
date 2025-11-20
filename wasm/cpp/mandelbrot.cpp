#include <emscripten.h>
#include <cmath>

/**
 * Calculate the number of iterations for a point in the Mandelbrot set
 * 
 * @param real Real component of the complex number c
 * @param imag Imaginary component of the complex number c
 * @param max_iterations Maximum number of iterations to perform
 * @param escape_radius Threshold beyond which a point is considered escaped
 * @return The number of iterations before escape, or max_iterations if the point doesn't escape
 */
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    unsigned int calculatePoint(double real, double imag, unsigned int max_iterations, double escape_radius) {
        double c_real = real;
        double c_imag = imag;
        
        double z_real = 0.0;
        double z_imag = 0.0;
        
        double escape_radius_squared = escape_radius * escape_radius;
        
        for (unsigned int iteration = 0; iteration < max_iterations; iteration++) {
            // Calculate |z|^2 = z_real^2 + z_imag^2
            double z_magnitude_squared = z_real * z_real + z_imag * z_imag;
            
            // Check if point has escaped
            if (z_magnitude_squared > escape_radius_squared) {
                return iteration;
            }
            
            // Calculate z = z^2 + c
            // (a + bi)^2 = a^2 - b^2 + 2abi
            double z_real_temp = z_real * z_real - z_imag * z_imag + c_real;
            z_imag = 2.0 * z_real * z_imag + c_imag;
            z_real = z_real_temp;
        }
        
        // Point did not escape within max_iterations
        return max_iterations;
    }
}
