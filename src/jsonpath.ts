import { JSONPath } from "jsonpath-plus";
import { logger } from "./logger.js";

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
