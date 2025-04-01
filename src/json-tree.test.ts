import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseJson } from "./json-tree.js";

describe("Json Tree", () => {
	describe("parseJson function", () => {
		beforeAll(() => {});

		afterAll(() => {});

		it("Should parse json with locations and ranges", async () => {
			const json = `{
				"hello": "world",
				"foo": "bar"
			}`;

			const ast = parseJson(json);

			// Verify the AST contains the expected properties
			expect(ast.type).toBe("ObjectExpression");
			expect(ast.properties).toHaveLength(2);
			
			// Check the first property
			const firstProp = ast.properties[0];
			expect(firstProp.key.value).toBe("hello");
			expect(firstProp.value.value).toBe("world");
			
			// Check the second property
			const secondProp = ast.properties[1];
			expect(secondProp.key.value).toBe("foo");
			expect(secondProp.value.value).toBe("bar");
			
			// Verify location information is present
			expect(ast.loc).toBeDefined();
			expect(firstProp.loc).toBeDefined();
			expect(secondProp.loc).toBeDefined();
		});
	});
});
