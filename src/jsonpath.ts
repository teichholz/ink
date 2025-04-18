import { compile } from "jsonpointer";
import { logger } from "./logger.js";
import { Result } from "./types.js";

export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONArray
	| JSONObject;

interface JSONObject {
	[key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

export function getJsonPointer(
	json: JSONValue,
	path: string,
	replacements: Map<string, string> = new Map(),
): JSONValue {
	const regex = new RegExp(replacements.keys().toArray().join("|"), "g");
	const augmentedPath = path.replaceAll(
		regex,
		(match) => replacements.get(match) ?? "",
	);

	logger.debug(`Augmented path: ${augmentedPath}`);

	const { get } = compile(augmentedPath);

	return get(json as any);
}

/**
 * Shallow modify a JSON value at a given path.
 */
export function modifyJsonPointer<T extends JSONValue>(
	json: T,
	update: any,
	pointer: string,
): Result<T, Error> {
	if (!pointer || pointer === "") {
		return Result.ok(update as T);
	}

	const { set } = compile(pointer);
	set(json as any, update);

	return Result.ok(json);
}
