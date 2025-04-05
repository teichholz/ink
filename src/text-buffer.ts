import { createReadStream } from "node:fs";
import {
	type PieceTreeBase,
	PieceTreeTextBufferBuilder,
} from "vscode-textbuffer";

export class TextBuffer {
	private _buffer: PieceTreeBase;
	public changed = 0;

	constructor(content: string | Buffer) {
		const builder = new PieceTreeTextBufferBuilder();
		if (typeof content === "string") {
			builder.acceptChunk(content);
		} else {
			builder.acceptChunk(content.toString("utf-8"));
		}
		this._buffer = builder.finish().create(1);
	}

	static async fromFile(filePath: string): Promise<TextBuffer> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			const stream = createReadStream(filePath);

			stream.on("data", (chunk) => {
				chunks.push(Buffer.from(chunk));
			});

			stream.on("end", () => {
				const buffer = Buffer.concat(chunks);
				resolve(new TextBuffer(buffer));
			});

			stream.on("error", (err) => {
				reject(err);
			});
		});
	}

	static fromString(content: string): TextBuffer {
		return new TextBuffer(content);
	}

	static empty(): TextBuffer {
		return new TextBuffer("");
	}

	/**
	 * @param line - The line number to replace - 0 based
	 * @param startCol - The start column number to replace - 0 based
	 * @param endCol - The end column number to replace - 0 based
	 * @param newContent - The new content to insert
	 */
	replaceRegion(
		line: number,
		startCol: number,
		endCol: number,
		newContent: string,
	): void {
		const start = this._buffer.getOffsetAt(line + 1, startCol + 1);
		this._buffer.delete(start, endCol - startCol);
		this._buffer.insert(start, newContent);
		this.changed++;
	}

	/**
	 * @param line - The line number to replace - 1 based
	 * @param col - The column number to replace - 1 based
	 * @param cnt - The number of characters to replace
	 * @param newContent - The new content to insert
	 */
	replace(line: number, col: number, cnt: number, newContent: string): void {
		const start = this._buffer.getOffsetAt(line, col);
		this._buffer.delete(start, cnt);
		this._buffer.insert(start, newContent);
		this.changed++;
	}

	insert(offset: number, content: string): void {
		this._buffer.insert(offset, content);
	}

	delete(offset: number, cnt: number): void {
		this._buffer.delete(offset, cnt);
	}

	get length(): number {
		return this._buffer.getLength();
	}

	getText(): string[] {
		return this._buffer.getLinesContent();
	}
}
