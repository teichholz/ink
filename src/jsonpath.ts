import { JSONPath } from "jsonpath-plus";
import { logger } from "./logger.js";
import { Res, type Result } from "./types.js";

namespace Json {
	export function parse(json: string): JSONValue {
		return JSON.parse(json);
	}
}

type JSONValue = string | number | boolean | null | JSONArray | JSONObject;

interface JSONObject {
	[key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

export function getJsonPath(
	json: JSONValue,
	path: string,
	replacements: Record<string, string>,
): object[] {
	const augmentedPath = path.replaceAll(
		new RegExp(Object.keys(replacements).join("|"), "g"),
		(match) => {
			return replacements[match];
		},
	);

	logger.debug(`Augmented path: ${augmentedPath}`);

	return JSONPath({ path: augmentedPath, json: json });
}

type ValueModification = string;

export function modifyJson(
	json: JSONValue,
	update: ValueModification,
	jsonPath: string,
): Result<JSONValue, Error> {
	const arr = jsonPath.split(".");
	if (arr?.[0] !== "$") {
		return Res.err(new Error("Invalid JSON path: must start with $"));
	}

	return Res.ok(innerModifyJson(json, update, arr));
}

function innerModifyJson(
	json: JSONValue,
	update: ValueModification,
	path: string[],
): JSONValue {
	// Base case: if we've reached the end of the path, return the update
	if (path.length === 1) {
		return update;
	}

	// Skip the first element ($ or already processed part)
	const currentPath = path[1];
	const remainingPath = path.slice(1);

	// Handle array indices (numeric paths)
	const isArrayIndex = !isNaN(Number(currentPath));
	
	if (Array.isArray(json) && isArrayIndex) {
		const index = Number(currentPath);
		const result = [...json];
		
		if (remainingPath.length === 1) {
			// We're at the target, update the value
			result[index] = update;
		} else {
			// Continue traversing
			result[index] = innerModifyJson(
				result[index] as JSONValue,
				update,
				remainingPath
			);
		}
		
		return result;
	} 
	// Handle object properties
	else if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
		const result = { ...json as JSONObject };
		
		if (remainingPath.length === 1) {
			// We're at the target, update the value
			result[currentPath] = update;
		} else {
			// Continue traversing
			result[currentPath] = innerModifyJson(
				result[currentPath] as JSONValue,
				update,
				remainingPath
			);
		}
		
		return result;
	}
	
	// If we can't modify the path (e.g., trying to access a property of a primitive),
	// return the original value
	logger.warn(`Cannot modify path ${path.join('.')} in JSON`);
	return json;
}
