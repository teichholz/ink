export namespace MathUtils {
	/**
	 * Like the normal modulus with the exception that it wraps around negative numbers to always return a positive result.
	 * @param a The dividend.
	 * @param b The divisor.
	 * @returns The modulus of a and b.
	 */
	export function mod(a: number, b: number): number {
		return ((a % b) + b) % b;
	}
}
