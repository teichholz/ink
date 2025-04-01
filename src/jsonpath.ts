import { JSONPath } from "jsonpath-plus";
import { logger } from "./logger.js";

type JSONValue = string | number | boolean | null | JSONArray | JSONObject;

interface JSONObject {
	[key: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

export function getJsonPath(
	json: null | boolean | number | string | object | unknown[],
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

type ValueModification = boolean | number | string;

// class JsonModification {
// 	private _path: UpdatePath;
// 	private _update: ValueModification;
//
// 	constructor(path: UpdatePath, update: ValueModification) {
// 		this._path = path;
// 		this._update = update;
// 	}
//
// 	get path(): UpdatePath {
// 		return this._path;
// 	}
//
// 	get update(): ValueModification {
// 		return this._update;
// 	}
// }

// class JsonModifications {
// 	private _json: JSONValue;
// 	private _modifications: JsonModification[];
//
// 	constructor(json: JSONValue) {
// 		this._json = json;
// 		this._modifications = [];
// 	}
//
// 	add(path: UpdatePath, update: ValueModification): void {
// 		this._modifications.push(new JsonModification(path, update));
// 	}
//
// 	apply(): void {
// 		for (const modification of this._modifications) {
// 			modifyJson(this._json, modification.update, modification.path);
// 		}
// 	}
//
// 	get json(): JSONValue {
// 		return this._json;
// 	}
//
// 	get modifications(): JsonModification[] {
// 		return this._modifications;
// 	}
// }

export function modifyJson(
	json: JSONValue,
	update: ValueModification,
	path: UpdatePath,
): JSONValue {
	if (path === null) {
		return update;
	}

	if (typeof path === "string") {
		if (typeof json !== "object") {
			throw new Error("JSON value is not an object");
		}

		(json as JSONObject)[path] = update;
		return json;
	}

	if (typeof path === "number") {
		if (!Array.isArray(json)) {
			throw new Error("JSON value is not an array");
		}

		json[path] = update;
		return json;
	}

	const ref = path[0];
	return modifyJson((json as JSONObject)[ref], update, path.slice(1));
}

type RootUpdate = null;
type NestedUpdate = string | number | (string | number)[];
type UpdatePath = RootUpdate | NestedUpdate;
