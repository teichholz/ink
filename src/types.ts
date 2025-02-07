type Ok<T> = readonly [data: T, error: null];

type Err<T> = readonly [data: null, error: T];

export type Result<T, E extends Error> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
	return [data, null] as const;
}

export function err<E extends Error>(error: E): Err<E> {
	return [null, error] as const;
}

export function unwrap<T, E extends Error>(result: Result<T, E>): T {
	if (result[0] === null) {
		throw result[1];
	}

	return result[0];
}

export function isOk<T, E extends Error>(
	result: Result<T, E>,
): result is Ok<T> {
	return result[0] !== null;
}

export function isErr<T, E extends Error>(
	result: Result<T, E>,
): result is Err<E> {
	return result[0] === null;
}
