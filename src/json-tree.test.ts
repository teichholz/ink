import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	JsonArrayNode,
	JsonBooleanNode,
	JsonNullNode,
	JsonNumberNode,
	JsonObjectNode,
	JsonPropertyNode,
	JsonStringNode,
	parseJson,
	transformAcornAst
} from "./json-tree.js";

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
			
			// Check property structure
			expect(firstProp.kind).toBe("init");
			expect(firstProp.method).toBe(false);
			expect(firstProp.shorthand).toBe(false);
			expect(firstProp.computed).toBe(false);
			
			// Check literal structure
			expect((firstProp.key as JsonStringNode).type).toBe("Literal");
			expect((firstProp.key as JsonStringNode).raw).toBe('"hello"');
			expect((firstProp.value as JsonStringNode).raw).toBe('"world"');

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

		it("Should parse complex JSON with different value types", async () => {
			const json = `{
				"string": "value",
				"number": 42,
				"boolean": true,
				"null": null,
				"array": [1, "two", false, null],
				"object": {
					"nested": "property"
				}
			}`;

			const ast = parseJson(json);

			// Verify the AST contains the expected properties
			expect(ast.type).toBe("ObjectExpression");
			expect(ast.properties).toHaveLength(6);

			// Check different value types
			const props = ast.properties;
			
			// String
			expect((props[0].key as JsonStringNode).value).toBe("string");
			expect((props[0].value as JsonStringNode).value).toBe("value");
			expect((props[0].value as JsonStringNode).type).toBe("Literal");
			
			// Number
			expect((props[1].key as JsonStringNode).value).toBe("number");
			expect((props[1].value as JsonNumberNode).value).toBe(42);
			expect((props[1].value as JsonNumberNode).type).toBe("Literal");
			
			// Boolean
			expect((props[2].key as JsonStringNode).value).toBe("boolean");
			expect((props[2].value as JsonBooleanNode).value).toBe(true);
			expect((props[2].value as JsonBooleanNode).type).toBe("Literal");
			
			// Null
			expect((props[3].key as JsonStringNode).value).toBe("null");
			expect((props[3].value as JsonNullNode).value).toBe(null);
			expect((props[3].value as JsonNullNode).type).toBe("Literal");
			
			// Array
			expect((props[4].key as JsonStringNode).value).toBe("array");
			expect((props[4].value as JsonArrayNode).type).toBe("ArrayExpression");
			expect((props[4].value as JsonArrayNode).elements).toHaveLength(4);
			
			// Object
			expect((props[5].key as JsonStringNode).value).toBe("object");
			expect((props[5].value as JsonObjectNode).type).toBe("ObjectExpression");
			expect((props[5].value as JsonObjectNode).properties).toHaveLength(1);
			
			// Check nested property
			const nestedProp = (props[5].value as JsonObjectNode).properties[0];
			expect((nestedProp.key as JsonStringNode).value).toBe("nested");
			expect((nestedProp.value as JsonStringNode).value).toBe("property");
		});
	});
});
