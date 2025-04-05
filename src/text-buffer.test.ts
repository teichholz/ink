import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TextBuffer } from "./text-buffer.js";

describe("TextBuffer", () => {
	let tempFilePath: string;

	beforeAll(() => {
		// Create a temporary file for testing
		const tempDir = os.tmpdir();
		tempFilePath = path.join(tempDir, `text-buffer-test-${Date.now()}.txt`);
		fs.writeFileSync(tempFilePath, "Hello\nWorld\nTest");
	});

	afterAll(() => {
		// Clean up the temporary file
		if (fs.existsSync(tempFilePath)) {
			fs.unlinkSync(tempFilePath);
		}
	});

	describe("static factory methods", () => {
		it("should create a buffer from a string", () => {
			const buffer = TextBuffer.fromString("Line 1\nLine 2");

			expect(buffer.getText()).toEqual(["Line 1", "Line 2"]);
		});

		it("should create an empty buffer", () => {
			const buffer = TextBuffer.empty();

			expect(buffer.getText()).toEqual([""]);
		});
	});

	describe("text manipulation", () => {
		it("should replace text within the buffer", () => {
			const buffer = TextBuffer.fromString("Hello World");

			buffer.replace(1, 1, 5, "Goodbye");
			expect(buffer.getText()).toEqual(["Goodbye World"]);
		});

		it("should handle insertions", () => {
			const buffer = TextBuffer.fromString("Hello World");

			buffer.insert(6, "Beautiful ");
			expect(buffer.getText()).toEqual(["Hello Beautiful World"]);
		});

		it("should handle inserting nothing", () => {
			const buffer = TextBuffer.fromString("Hello World");

			buffer.insert(0, "");
			expect(buffer.getText()).toEqual(["Hello World"]);
		});

		it("should handle deletions", () => {
			const buffer = TextBuffer.fromString("Hello World");

			buffer.delete(5, 6);
			expect(buffer.getText()).toEqual(["Hello"]);
		});

		it("should handle deleting nothing", () => {
			const buffer = TextBuffer.fromString("Hello World");

			buffer.delete(0, 0);
			expect(buffer.getText()).toEqual(["Hello World"]);
		});
	});

	describe("getText", () => {
		it("should return the buffer content as an array of lines", () => {
			const buffer = TextBuffer.fromString("Line 1\nLine 2\nLine 3");

			expect(buffer.getText()).toEqual(["Line 1", "Line 2", "Line 3"]);
		});

		it("should handle empty lines", () => {
			const buffer = TextBuffer.fromString("Line 1\n\nLine 3");

			expect(buffer.getText()).toEqual(["Line 1", "", "Line 3"]);
		});
	});
});
