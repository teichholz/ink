import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Config } from "./config.js";
import { extractLabelsFromFile, find } from "./tools.js";
import { Res } from "./types.js";

describe("Tools", () => {
	describe("find function", () => {
		const testDir = join(tmpdir(), `tools-test-${Date.now()}`);
		const labelsDir = join(testDir, "labels");

		// Config for testing
		const testConfig: Config = {
			rootDir: testDir,
			labelFilePattern: ".+_(en|fr)\\.json",
			jsonPath: "$",
			languagePriority: ["en", "fr"],
			mustHaveLabelFiles: ["en", "fr"],
			jsonIndent: 2,
			// Other config properties not needed for this test
		};

		// Paths to find/fd executables
		// Using find since it's more likely to be available on all systems
		const findPath = "/usr/bin/fd";

		beforeAll(() => {
			// Create test directory structure
			mkdirSync(labelsDir, { recursive: true });

			// Create test label files
			writeFileSync(
				join(labelsDir, "help_en.json"),
				JSON.stringify({ hello: "world" }),
			);
			writeFileSync(
				join(labelsDir, "help_fr.json"),
				JSON.stringify({ bonjour: "monde" }),
			);
			writeFileSync(
				join(labelsDir, "error_en.json"),
				JSON.stringify({ error: "Not found" }),
			);

			// Create a non-matching file
			writeFileSync(
				join(labelsDir, "config.json"),
				JSON.stringify({ config: true }),
			);
		});

		afterAll(() => {
			// Clean up test directory
			rmSync(testDir, { recursive: true, force: true });
		});

		it("should find label files using find command", async () => {
			const results = [];

			for await (const result of find(findPath, testConfig)) {
				results.push(result);
			}

			// Should find 3 matching files
			expect(results.length).toBe(3);

			// Check that we found all the expected files
			const paths = results.map((r) => r.path);

			// Check that all our test files are found
			expect(paths.some((p) => p.includes("help_en.json"))).toBe(true);
			expect(paths.some((p) => p.includes("help_fr.json"))).toBe(true);
			expect(paths.some((p) => p.includes("error_en.json"))).toBe(true);

			// Check that non-matching files are not included
			expect(paths.some((p) => p?.includes("config.json"))).toBe(false);
		});

		it("should handle non-existent directories", async () => {
			// Create a config with a non-existent directory
			const badConfig: Config = {
				...testConfig,
				rootDir: join(testDir, "non-existent-dir"),
			};

			const results = [];
			for await (const result of find(findPath, badConfig)) {
				results.push(result);
			}

			expect(results.length).toBe(0);
		});

		it("should handle empty directories", async () => {
			// Create an empty directory
			const emptyDir = join(testDir, "empty");
			mkdirSync(emptyDir, { recursive: true });

			// Create a config with the empty directory
			const emptyConfig: Config = {
				...testConfig,
				rootDir: emptyDir,
			};

			const results = [];
			for await (const result of find(findPath, emptyConfig)) {
				results.push(result);
			}

			// Should have no results
			expect(results.length).toBe(0);
		});
	});

	describe("extractLabelsFromFile", () => {
		it("should extract labels from a file", async () => {
			// Create a mock file object with actual JSON content
			const mockFile = {
				path: JSON.stringify({
					labels: {
						en: {
							greeting: "Hello",
							farewell: "Goodbye",
							"error.notFound": "Not Found",
						},
					},
				}),
				language: "en",
				rootFileName: "messages",
			};

			const labels = Res.unwrap(
				await extractLabelsFromFile(mockFile, "$.labels.%lang"),
			);

			// Check that the result is a Map
			expect(labels).toBeInstanceOf(Map);
			//
			// Check that the Map contains the expected entries
			expect(labels.size).toBe(3);
			expect(labels.get("greeting")).toBe("Hello");
			expect(labels.get("farewell")).toBe("Goodbye");
			expect(labels.get("error.notFound")).toBe("Not Found");
		});

		it("should handle empty label files", async () => {
			const mockFile = {
				path: JSON.stringify({
					labels: {
						en: {},
					},
				}),
				language: "en",
				rootFileName: "empty",
			};

			const labels = Res.unwrap(
				await extractLabelsFromFile(mockFile, "$.labels.%lang"),
			);

			// Check that the result is an empty Map
			expect(labels).toBeInstanceOf(Map);
			expect(labels.size).toBe(0);
		});
	});
});
