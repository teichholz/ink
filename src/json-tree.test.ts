import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JsonObjectNode, JsonPropertyNode, JsonStringNode, parseJson } from "./json-tree.js";

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
			const firstProp = ast.properties[0] as JsonPropertyNode;
			expect((firstProp.key as JsonStringNode).value).toBe("hello");
			expect((firstProp.value as JsonStringNode).value).toBe("world");

			// Check the second property
			const secondProp = ast.properties[1] as JsonPropertyNode;
			expect((secondProp.key as JsonStringNode).value).toBe("foo");
			expect((secondProp.value as JsonStringNode).value).toBe("bar");

			// Verify location information is present
			expect(ast.loc).toBeDefined();
			expect(ast.loc.start.line).toBeGreaterThan(0);
			expect(ast.loc.start.column).toBeGreaterThanOrEqual(0);
			expect(ast.loc.end.line).toBeGreaterThan(0);
			expect(ast.loc.end.column).toBeGreaterThan(0);
			
			// Check property locations
			expect(firstProp.loc).toBeDefined();
			expect(firstProp.loc.start.line).toBeGreaterThan(0);
			expect(secondProp.loc).toBeDefined();
			expect(secondProp.loc.end.line).toBeGreaterThan(0);
		});
	});
});
