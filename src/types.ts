type Ok<T> = readonly [data: T, error: null];

type Err<T> = readonly [data: null, error: T];

export type Result<T, E extends Error> = Ok<T> | Err<E>;

export const Result = {
	ok<T>(data: T): Ok<T> {
		return [data, null] as const;
	},

	err<E extends Error>(error: E): Err<E> {
		return [null, error] as const;
	},

	unwrap<T, E extends Error>(result: Result<T, E>): T {
		if (result[0] === null) {
			throw result[1];
		}

		return result[0];
	},

	isOk<T, E extends Error>(result: Result<T, E>): result is Ok<T> {
		return result[0] !== null;
	},

	isErr<T, E extends Error>(result: Result<T, E>): result is Err<E> {
		return result[0] === null;
	},
};
