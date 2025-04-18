export namespace MathUtils {
	/**
	 * Calculates the modulus of two numbers. But wraps around negative numbers to always return a positive result.
	 * @param a The dividend.
	 * @param b The divisor.
	 * @returns The modulus of a and b.
	 */
	export function mod(a: number, b: number): number {
		return ((a % b) + b) % b;
	}
}
