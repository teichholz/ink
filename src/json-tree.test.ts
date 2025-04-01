import { afterAll, beforeAll, describe, it } from "vitest";
import { parseJson } from "./json-tree.js";

describe("Json Tree", () => {
	describe("find function", () => {
		beforeAll(() => {});

		afterAll(() => {});

		it("Should parse json with locations and ranges", async () => {
			const json = `const a = {
				\"hello\": \"world\",
				\"foo\": \"bar\"
			}`;

			const ast = parseJson(json);

			console.log(JSON.stringify(ast, null, 2));
		});
	});
});
