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

export function modifyJson(
	json: JSONValue,
	update: string,
	jsonPath: string,
): Result<JSONValue, Error> {
	const arr = jsonPath.split(".");

	return innerModifyJson(json, update, arr);
}

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

	const parsed = Number.parseInt(path[0]);
	const ptr = parsed ? parsed : path[0];

	if (path.length === 1) {
		if (Array.isArray(json) && typeof ptr === "number") {
		}

		return Res.ok(update);
	}

	return Res.err(new Error(`Invalid JSON path: ${path.join(".")}`));
}
