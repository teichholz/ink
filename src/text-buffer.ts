import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
	DefaultEndOfLine,
	type PieceTreeBase,
	PieceTreeTextBufferBuilder,
} from "vscode-textbuffer";

export class TextBuffer {
	private _buffer: PieceTreeBase;

	constructor(stream: Readable) {
		const builder = new PieceTreeTextBufferBuilder();
		stream.on("data", (chunk) => {
			builder.acceptChunk(chunk);
		});
		this._buffer = builder.finish().create(DefaultEndOfLine.LF);
	}

	static fromFile(filePath: string): TextBuffer {
		const stream = createReadStream(filePath);
		return new TextBuffer(stream);
	}

	static fromString(content: string): TextBuffer {
		const stream = Readable.from([content]);
		return new TextBuffer(stream);
	}

	static empty(): TextBuffer {
		const stream = Readable.from([]);
		return new TextBuffer(stream);
	}

	replace(start: number, end: number, newContent: string): void {
		this._buffer.delete(start, end - start);
		this._buffer.insert(start, newContent);
	}

	getText(): string[] {
		return this._buffer.getLinesContent();
	}
}
