import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { rgPath as installedRgPath } from "@vscode/ripgrep";
import {
	type Channel,
	type ExecResult,
	asyncYield,
	execChannel,
} from "./channel.js";
import type { Config } from "./config.js";
import { getJsonPath } from "./jsonpath.js";
import { logger } from "./logger.js";
import { findPathTools } from "./os.js";
import { type Result, err, ok } from "./types.js";

export interface Tools {
	rg: string;
	fd: string;
}

export async function getTools(): Promise<Result<Tools, Error>> {
	const { findPath, fdPath, rgPath } = await findPathTools();

	if (!findPath || !fdPath) {
		return err(new Error("Could not find find or fd executables"));
	}

	return ok({ rg: rgPath || installedRgPath, fd: fdPath || findPath });
}

class Labels extends Map<string, unknown> {
	file: File;

	constructor(file: File) {
		super([]);
		this.file = file;
	}
}

export async function extractLabelsFromFile(
	file: File,
	jsonPath: string,
): Promise<Result<Labels, Error>> {
	try {
		logger.debug(
			`Extracting labels for ${JSON.stringify(file)} with jsonPath ${jsonPath}`,
		);

		const json = JSON.parse(await readFile(file.path, "utf8"));

		const root = getJsonPath(json, jsonPath, {
			"%lang": file.language,
		});

		logger.debug(`Extracted labels: ${JSON.stringify(root)}`);

		if (root.length !== 1 || typeof root[0] !== "object") {
			return err(
				new Error("Invalid json path: Path must point to a single object"),
			);
		}

		// json path returns an array of objects, must always point to a single object for us
		const object = root[0] || {};

		const m: Labels = new Labels(file);

		for (const [key, value] of Object.entries(object)) {
			m.set(key, value);
		}

		return ok(m);
	} catch (error) {
		return err(error as Error);
	}
}

export type File = {
	// The full path to the file
	path: string;

	// The captured language
	language: string;

	// The file name without the language capture
	// e.g "src/labels/help_en.json" => help_.json
	rootFileName: string;
};

/**
 * @param exePath Path to the fd / find executable
 * @param searchPath Path to search
 * @param pattern Regex pattern to search for
 */
export async function* find(
	findOrFdPath: string,
	config: Config,
): AsyncGenerator<File> {
	const seen = new Set<string>();

	const chan = findOrFdPath.includes("fd")
		? fdChan(findOrFdPath, config)
		: findChan(findOrFdPath, config);

	for await (const message of asyncYield(chan)) {
		const data = message.data;

		if (data.stderr.length > 0) {
			continue;
		}

		for (const line of data.stdout.split("\n")) {
			// ensure that regex returns the indices
			const uniqueFlags = new Set("d");
			const regex = new RegExp(
				config.labelFilePattern,
				[...uniqueFlags].join(""),
			);
			const match = line.match(regex);

			if (!match) {
				continue;
			}

			if (seen.has(line)) {
				continue;
			}
			seen.add(line);

			const language = match[1];
			const rootFileName =
				line.substring(0, match.indices![1][0]) +
				line.substring(match.indices![1][1]);
			const baseRootFileName = basename(rootFileName);

			yield { path: line, language, rootFileName: baseRootFileName };
		}
	}
}

function fdChan(fdPath: string, config: Config): Channel<ExecResult> {
	const args = [
		"--type",
		"file",
		"--extension",
		"json",
		config.labelFilePattern.toString(),
		config.rootDir,
	];

	return execChannel(fdPath, args);
}

function findChan(findPath: string, config: Config): Channel<ExecResult> {
	const args = [
		"-type",
		"f",
		"-regex",
		config.labelFilePattern.toString(),
		config.rootDir,
	];

	return execChannel(findPath, args);
}
