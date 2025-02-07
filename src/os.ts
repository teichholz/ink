import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Searches for find and fd executables on the system path
 * @returns An object containing paths to find and fd executables if found
 */
export async function findPathTools(): Promise<{
	findPath: string | null;
	fdPath: string | null;
	rgPath: string | null;
}> {
	const [findPath, fdPath, rgPath] = await Promise.all([
		findExecutable("find"),
		findExecutable("fd"),
		findExecutable("rg"),
	]);

	return { findPath, fdPath, rgPath };
}

/**
 * Searches for an executable in the system path
 * @param exe Name of the executable to find
 * @returns Path to the executable if found, null otherwise
 */
async function findExecutable(exe: string): Promise<string | null> {
	const config = getPathConfig();
	const pathDirs = getPathDirectories(config.separator);
	let path = findExecutableInPath(exe, pathDirs, config.executableExt);
	if (!path) {
		path = await findExecutableWithWhich(exe, config.whichCommand);
	}
	return path;
}

/**
 * Platform-specific path configuration
 */
interface PathConfig {
	separator: string;
	executableExt: string;
	whichCommand: string;
}

/**
 * Get platform-specific path configuration
 * @returns PathConfig object with platform-specific settings
 */
function getPathConfig(): PathConfig {
	const isWindows = os.platform() === "win32";
	return {
		separator: isWindows ? ";" : ":",
		executableExt: isWindows ? ".exe" : "",
		whichCommand: isWindows ? "where" : "which",
	};
}

/**
 * Get directories from PATH environment variable
 * @param separator Path separator character
 * @returns Array of directories in PATH
 */
function getPathDirectories(separator: string): string[] {
	// biome-ignore lint/complexity/useLiteralKeys: PATH must be an index access
	const envPath = process.env["PATH"] || "";
	return envPath.split(separator).filter((dir) => !!dir);
}

/**
 * Search for an executable in PATH directories
 * @param executableName Name of the executable to find
 * @param pathDirs Directories to search in
 * @param executableExt Extension for executables
 * @returns Path to the executable if found, null otherwise
 */
function findExecutableInPath(
	executableName: string,
	pathDirs: string[],
	executableExt: string,
): string | null {
	for (const dir of pathDirs) {
		const possiblePath = path.join(dir, `${executableName}${executableExt}`);
		if (fs.existsSync(possiblePath)) {
			return possiblePath;
		}
	}
	return null;
}

/**
 * Search for an executable using which/where command
 * @param executableName Name of the executable to find
 * @param whichCommand Command to use (which/where)
 * @returns Path to the executable if found, null otherwise
 */
async function findExecutableWithWhich(
	executableName: string,
	whichCommand: string,
): Promise<string | null> {
	try {
		const { stdout } = await execAsync(`${whichCommand} ${executableName}`);
		return stdout.trim() || null;
	} catch (error) {
		// Executable not found
		return null;
	}
}
