import { JSONPath } from "jsonpath-plus";
import { logger } from "./logger.js";
import { Res, type Result } from "./types.js";

type JSONValue = string | number | boolean | null | JSONArray | JSONObject;

interface JSONObject {
	[key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

export function getJsonPath(
	json: JSONValue,
	path: string,
	replacements: Map<string, string>,
): object[] {
	const regex = new RegExp(replacements.keys().toArray().join("|"), "g");
	const augmentedPath = path.replaceAll(
		regex,
		(match) => replacements.get(match) ?? "",
	);

	logger.debug(`Augmented path: ${augmentedPath}`);

	return JSONPath({
		path: augmentedPath,
		json: json,
		wrap: false,
		sandbox: replacements,
	});
}

export function modifyJsonPath(
	json: JSONValue,
	update: string,
	jsonPath: string,
): Result<JSONValue, Error> {
	const arr = jsonPath.split(".");

	return innerModifyJson(json, update, arr);
}

/**
 * Shallow modify a JSON object at a given json path
 */
function innerModifyJson(
	json: JSONValue,
	update: string,
	path: string[],
): Result<JSONValue, Error> {
	if (path.length === 0) {
		return Res.err(new Error("Invalid JSON path: must not be empty"));
	}

	if (typeof json === "string" && path.join() === "$") {
		return Res.ok(update);
	}

	if (typeof json !== "object") {
		return Res.err(new Error("Invalid JSON: json must be an object"));
	}

	let restPath = path;
	let obj = json as unknown as any;
	while (restPath.length > 1) {
		const parsed = Number.parseInt(restPath[0]);
		const ptr = parsed ? parsed : restPath[0];
		restPath = restPath.slice(1);
		obj = obj[ptr];

		if (typeof obj !== "object") {
			return Res.err(new Error(`Invalid JSON path: ${path.join(".")}`));
		}
	}

	obj[restPath[0]] = update;
	return Res.ok(json);
}
