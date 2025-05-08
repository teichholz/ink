import { readFile, writeFile } from "node:fs/promises";
import { type Change, diffWords } from "diff";
import type { JsonEdit } from "./atoms/json-editor-atoms.js";
import { modifyJsonPointer } from "./jsonpath.js";

export async function calculateDiff(edit: JsonEdit): Promise<Change[]> {
	const diff = diffWords(edit.originalValue, edit.value);
	return diff;
}

export async function applyEdit(
	edit: JsonEdit,
	jsonIndent: number,
): Promise<Error | null> {
	try {
		const json = JSON.parse(
			await readFile(edit.filePath, { encoding: "utf-8" }),
		);

		const result = modifyJsonPointer(json, edit.value, edit.path);

		if (result.isErr()) {
			return result.error;
		}

		await writeFile(
			edit.filePath,
			JSON.stringify(result.value, null, jsonIndent),
		);

		return null;
	} catch (err) {
		return err as Error;
	}
}
