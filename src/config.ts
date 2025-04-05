import { dirname } from "node:path";
import { findUp } from "find-up";
import { Res, type Result } from "./types.js";

export type Config = {
	/**
	 * Regex which matches files that contain translations
	 * Should contain a capture group for the translation key
	 *
	 * eg. /home/user/project/src/labels/help_en.json (en should be the capture group)
	 */
	labelFilePattern: string | RegExp;

	/**
	 * In what order should the languages be displayed
	 */
	languagePriority: string[];

	/**
	 * The default languages that must exist
	 */
	mustHaveLabelFiles: string[];

	/**
	 * A json path according to https://www.rfc-editor.org/rfc/rfc9535.html
	 * that is used to extract the translation keys from the json files
	 *
	 * The json path must point to a json object containing the label - value pairs
	 * Labels must be strings
	 * Values cain be any json value
	 *
	 * Can contain specific values:
	 * %lang = language of the file (the capture group from labelFilePattern)
	 */
	jsonPath: string;

	/**
	 * Directory from where to search for translation files
	 * Always the directory containing int.mjs
	 */
	rootDir: string;
};

/**
 * Finds and imports the configuration from int.mjs file
 * @returns The configuration object from int.mjs
 */
export async function getConfig(): Promise<Result<Config, Error>> {
	const configPath = await findUp("int.mjs");

	if (!configPath) {
		return Res.err(Error("Could not find int.mjs configuration file"));
	}

	const configModule = await import(configPath);
	const config = configModule.default as Config;
	config.rootDir = dirname(configPath);

	return Res.ok(config);
}
