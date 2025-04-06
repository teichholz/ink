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
	if (path === null) {
		return update;
	}

	const parsed = Number.parseInt(path[0]);
	const ptr = parsed ? parsed : (path[0] as string);
}
