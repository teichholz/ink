import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";

/**
 * Represents a message that can be sent through a channel
 */
export interface ChannelMessage<T> {
	data: T;
	error?: Error;
	done: boolean;
}

/**
 * A Go-like channel implementation for asynchronous communication
 */
export class Channel<T> {
	private buffer: Array<ChannelMessage<T>> = [];
	private emitter = new EventEmitter();
	private closed = false;

	/**
	 * Creates a new channel
	 * @param bufferSize Optional buffer size (0 for unbuffered)
	 */
	constructor(private bufferSize = 0) {}

	/**
	 * Sends a value to the channel
	 * @param value The value to send
	 * @param done Whether this is the final message
	 * @returns Promise that resolves when the value is sent
	 */
	async send(value: T, done = false): Promise<void> {
		if (this.closed) {
			throw new Error("Cannot send on closed channel");
		}

		const message: ChannelMessage<T> = { data: value, done };

		if (this.bufferSize > 0 && this.buffer.length < this.bufferSize) {
			this.buffer.push(message);
			this.emitter.emit("message");
			return;
		}

		return new Promise<void>((resolve) => {
			const tryPush = () => {
				if (this.bufferSize === 0 || this.buffer.length < this.bufferSize) {
					this.buffer.push(message);
					this.emitter.emit("message");
					resolve();
					this.emitter.removeListener("receive", tryPush);
				}
			};

			tryPush();
			if (this.buffer.length >= this.bufferSize) {
				this.emitter.on("receive", tryPush);
			}
		});
	}

	/**
	 * Receives a value from the channel
	 * @returns Promise that resolves with the next message
	 */
	async receive(): Promise<ChannelMessage<T>> {
		if (this.closed && this.buffer.length === 0) {
			return { data: null as unknown as T, done: true };
		}

		if (this.buffer.length > 0) {
			const message = this.buffer.shift()!;
			this.emitter.emit("receive");
			return message;
		}

		return new Promise<ChannelMessage<T>>((resolve) => {
			const tryPop = () => {
				if (this.buffer.length > 0) {
					const message = this.buffer.shift()!;
					this.emitter.emit("receive");
					resolve(message);
					this.emitter.removeListener("message", tryPop);
				}
			};

			this.emitter.on("message", tryPop);
		});
	}

	/**
	 * Closes the channel
	 */
	close(): void {
		this.closed = true;
		this.emitter.emit("message");
	}

	/**
	 * Checks if the channel is closed
	 */
	isClosed(): boolean {
		return this.closed;
	}
}

/**
 * Options for executing a shell process
 */
export interface ExecOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	shell?: string | boolean;
	timeout?: number;
	maxBuffer?: number;
	killSignal?: NodeJS.Signals | number;
}

/**
 * Result from a shell process execution
 */
export interface ExecResult {
	stdout: string;
	stderr: string;
	code: number | null;
	signal: NodeJS.Signals | null;
}

/**
 * Executes a shell command and returns a channel with the results
 * @param command The command to execute
 * @param args Command arguments
 * @param options Execution options
 * @returns A channel that will receive execution results
 */
export function execChannel(
	command: string,
	args: string[] = [],
	options: ExecOptions = {},
): Channel<ExecResult> {
	const channel = new Channel<ExecResult>(1);
	let stdoutData = "";
	let stderrData = "";
	let process: ChildProcess | null = null;

	try {
		process = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
			shell: options.shell,
		});

		// Set up timeout if specified
		let timeoutId: NodeJS.Timeout | undefined;
		if (options.timeout) {
			timeoutId = setTimeout(() => {
				if (process && !process.killed) {
					process.kill(options.killSignal || "SIGTERM");
					channel.send(
						{
							stdout: stdoutData,
							stderr: `${stderrData}\nProcess timed out`,
							code: null,
							signal: null,
						},
						true,
					);
				}
			}, options.timeout);
		}

		// Collect stdout
		process.stdout?.on("data", (data) => {
			const chunk = data.toString();
			stdoutData += chunk;

			channel.send({
				stdout: chunk,
				stderr: "",
				code: null,
				signal: null,
			});
		});

		// Collect stderr
		process.stderr?.on("data", (data) => {
			const chunk = data.toString();
			stderrData += chunk;

			channel.send({
				stdout: "",
				stderr: chunk,
				code: null,
				signal: null,
			});
		});

		// Handle process completion
		process.on("close", (code, signal) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			channel.send(
				{
					stdout: stdoutData,
					stderr: stderrData,
					code,
					signal,
				},
				true,
			);

			channel.close();
		});

		// Handle process errors
		process.on("error", (error) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			channel.send(
				{
					stdout: stdoutData,
					stderr: `${stderrData}\n${error.message}`,
					code: null,
					signal: null,
				},
				true,
			);

			channel.close();
		});
	} catch (error) {
		// Handle spawn errors
		channel.send(
			{
				stdout: "",
				stderr: error instanceof Error ? error.message : String(error),
				code: null,
				signal: null,
			},
			true,
		);

		channel.close();
	}

	return channel;
}

/**
 * Creates a channel from an array of values
 * @param values Array of values to send through the channel
 * @returns A channel containing the values
 */
export function fromArray<T>(values: readonly T[]): Channel<T> {
	const channel = new Channel<T>(values.length);

	// Send all values to the channel
	(async () => {
		let i = 0;
		for (const value of values) {
			await channel.send(value, i === values.length - 1);
			i++;
		}
		channel.close();
	})();

	return channel;
}

/**
 * Collects all values from a channel into an array
 * @param channel The channel to collect from
 * @returns Promise that resolves with an array of all values
 */
export async function toArray<T>(channel: Channel<T>): Promise<T[]> {
	const result: T[] = [];

	while (true) {
		const message = await channel.receive();
		result.push(message.data);

		if (message.done) {
			break;
		}
	}

	return result;
}

export async function* asyncYield<T>(
	channel: Channel<T>,
): AsyncGenerator<ChannelMessage<T>> {
	while (true) {
		const message = await channel.receive();
		yield message;

		if (message.done) {
			return;
		}
	}
}
