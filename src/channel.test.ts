import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Channel,
	type ExecResult,
	asyncYield,
	execChannel,
	fromArray,
	toArray,
} from "./channel.js";

describe("Channel", () => {
	describe("Basic channel operations", () => {
		it("should send and receive values", async () => {
			const channel = new Channel<number>();

			// Send a value
			await channel.send(42);

			// Receive the value
			const message = await channel.receive();

			expect(message.data).toBe(42);
			expect(message.done).toBe(false);
		});

		it("should handle buffered channels", async () => {
			const channel = new Channel<number>(3);

			// Send multiple values without blocking
			await channel.send(1);
			await channel.send(2);
			await channel.send(3);

			// Receive values
			expect((await channel.receive()).data).toBe(1);
			expect((await channel.receive()).data).toBe(2);
			expect((await channel.receive()).data).toBe(3);
		});

		it("should mark the last message as done", async () => {
			const channel = new Channel<string>();

			await channel.send("hello");
			await channel.send("world", true); // Mark as done

			const msg1 = await channel.receive();
			expect(msg1.data).toBe("hello");
			expect(msg1.done).toBe(false);

			const msg2 = await channel.receive();
			expect(msg2.data).toBe("world");
			expect(msg2.done).toBe(true);
		});

		it("should handle channel closing", async () => {
			const channel = new Channel<string>();

			// Close the channel
			channel.close();
			expect(channel.isClosed()).toBe(true);

			// Should still be able to receive (with done=true)
			const message = await channel.receive();
			expect(message.done).toBe(true);

			// Should throw when sending to closed channel
			await expect(channel.send("test")).rejects.toThrow(
				"Cannot send on closed channel",
			);
		});
	});

	describe("Utility functions", () => {
		it("should create a channel from an array", async () => {
			const values = [1, 2, 3, 4, 5];
			const channel = fromArray(values);

			for (const expected of values) {
				const { data } = await channel.receive();
				expect(data).toBe(expected);
			}

			// Last message should be marked as done
			const lastMessage = await channel.receive();
			expect(lastMessage.done).toBe(true);
		});

		it("should collect channel values into an array", async () => {
			const channel = new Channel<number>();

			// Send values
			await channel.send(1);
			await channel.send(2);
			await channel.send(3, true); // Mark as done

			// Collect values
			const result = await toArray(channel);
			expect(result).toEqual([1, 2, 3]);
		});

		it("should anync yield channel values", async () => {
			const channel = new Channel<number>();

			// Send values
			await channel.send(1);
			await channel.send(2);
			await channel.send(3, true); // Mark as done

			// Collect values
			const result = [];
			for await (const message of asyncYield(channel)) {
				result.push(message.data);
			}
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe("execChannel with ls binary", () => {
		const testDir = join(tmpdir(), `channel-test-${Date.now()}`);

		beforeEach(() => {
			// Create test directory if it doesn't exist
			if (!existsSync(testDir)) {
				const { execSync } = require("node:child_process");
				execSync(`mkdir -p ${testDir}`);
				execSync(
					`touch ${testDir}/file1.txt ${testDir}/file2.txt ${testDir}/file3.txt`,
				);
			}
		});

		afterEach(() => {
			// Clean up test directory
			const { execSync } = require("node:child_process");
			execSync(`rm -rf ${testDir}`);
		});

		it("should execute ls command and receive output", async () => {
			const channel = execChannel("ls", ["-la", testDir]);

			let stdoutContent = "";
			let stderrContent = "";
			let isDone = false;
			let exitCode: number | null = null;

			while (!isDone) {
				const message = await channel.receive();

				if (message.data.stdout) {
					stdoutContent += message.data.stdout;
				}

				if (message.data.stderr) {
					stderrContent += message.data.stderr;
				}

				if (message.done) {
					isDone = true;
					exitCode = message.data.code;
				}
			}

			// Verify the command executed successfully
			expect(exitCode).toBe(0);
			expect(stderrContent).toBe("");

			// Verify the output contains our test files
			expect(stdoutContent).toContain("file1.txt");
			expect(stdoutContent).toContain("file2.txt");
			expect(stdoutContent).toContain("file3.txt");
		});

		it("should handle command errors", async () => {
			// Try to list a non-existent directory
			const nonExistentDir = join(testDir, "does-not-exist");
			const channel = execChannel("ls", [nonExistentDir]);

			let stdoutContent = "";
			let stderrContent = "";
			let isDone = false;
			let exitCode: number | null = null;

			while (!isDone) {
				const message = await channel.receive();

				if (message.data.stdout) {
					stdoutContent += message.data.stdout;
				}

				if (message.data.stderr) {
					stderrContent += message.data.stderr;
				}

				if (message.done) {
					isDone = true;
					exitCode = message.data.code;
				}
			}

			// Verify the command failed
			expect(exitCode).not.toBe(0);
			expect(stderrContent).toContain("No such file or directory");
		});

		it("should handle command timeout", async () => {
			// Use sleep command with a timeout that's shorter than the sleep duration
			const channel = execChannel("sleep", ["2"], { timeout: 500 });

			let stderrContent = "";
			let isDone = false;

			while (!isDone) {
				const message = await channel.receive();

				if (message.data.stderr) {
					stderrContent += message.data.stderr;
				}

				if (message.done) {
					isDone = true;
				}
			}

			// Verify the timeout message
			expect(stderrContent).toContain("Process timed out");
		});

		it("should collect all output from ls command", async () => {
			const channel = execChannel("ls", ["-la", testDir]);

			// Use toArray to collect all messages
			const messages = await toArray(channel);

			// The last message should contain the complete output
			const lastMessage = messages[messages.length - 1] as ExecResult;
			expect(lastMessage.code).toBe(0);
			expect(lastMessage.stdout).toContain("file1.txt");
			expect(lastMessage.stdout).toContain("file2.txt");
			expect(lastMessage.stdout).toContain("file3.txt");
		});
	});
});
