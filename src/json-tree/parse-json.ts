import { readFile } from "node:fs/promises";
import type {
	ArrayExpression,
	Literal,
	Node,
	ObjectExpression,
	Property,
} from "acorn";
import { type ExpressionStatement, parse } from "acorn";
import type { JSONValue } from "../jsonpath.js";
import { Res, type Result } from "../types.js";

/**
 * Position information for a node in the JSON AST
 */
export interface Position {
	line: number;
	column: number;
}

/**
 * Location information for a node in the JSON AST
 */
export interface Location {
	/**
	 * Start position of node. Is inclusive.
	 */
	start: Position;

	/**
	 * End position of node. Is exclusive.
	 */
	end: Position;
}

/**
 * Base interface for all JSON AST nodes
 */
export interface JsonNode {
	type: string;
	loc: Location;
	range: [number, number];
}

/**
 * JSON string value node
 */
export interface JsonStringNode extends JsonNode {
	type: "String";
	value: string;
	raw: string;
}

/**
 * JSON number value node
 */
export interface JsonNumberNode extends JsonNode {
	type: "Number";
	value: number;
	raw: string;
}

/**
 * JSON boolean value node
 */
export interface JsonBooleanNode extends JsonNode {
	type: "Boolean";
	value: boolean;
	raw: string;
}

/**
 * JSON null value node
 */
export interface JsonNullNode extends JsonNode {
	type: "Null";
	value: null;
	raw: string;
}

/**
 * JSON property node (key-value pair)
 */
export interface JsonPropertyNode extends JsonNode {
	type: "Property";
	key: JsonStringNode;
	value: JsonValueNode;
	kind: "init";
	method: boolean;
	shorthand: boolean;
	computed: boolean;
}

/**
 * JSON object node
 */
export interface JsonObjectNode extends JsonNode {
	type: "Object";
	properties: JsonPropertyNode[];
}

/**
 * JSON array node
 */
export interface JsonArrayNode extends JsonNode {
	type: "Array";
	elements: JsonValueNode[];
}

/**
 * Union type for all possible JSON value nodes
 */
export type JsonValueNode =
	| JsonStringNode
	| JsonNumberNode
	| JsonBooleanNode
	| JsonNullNode
	| JsonObjectNode
	| JsonArrayNode;

/**
 * Type guards to help TypeScript infer the correct types
 */
export function isObjectNode(node: JsonNode): node is JsonObjectNode {
	return node.type === "Object";
}

export function isArrayNode(node: JsonNode): node is JsonArrayNode {
	return node.type === "Array";
}

export function isPropertyNode(node: JsonNode): node is JsonPropertyNode {
	return node.type === "Property";
}

export function isStringNode(node: JsonNode): node is JsonStringNode {
	return node.type === "String";
}

export function isNumberNode(node: JsonNode): node is JsonNumberNode {
	return node.type === "Number";
}

export function isBooleanNode(node: JsonNode): node is JsonBooleanNode {
	return node.type === "Boolean";
}

export function isNullNode(node: JsonNode): node is JsonNullNode {
	return node.type === "Null";
}

export async function parseJsonFile(
	file: string,
): Promise<Result<[JsonNode, JSONValue], Error>> {
	try {
		const fileContent = await readFile(file, "utf-8");

		const [jsonNode, err] = parseJson(fileContent);

		if (err) {
			return Res.err(err);
		}

		return Res.ok([jsonNode, JSON.parse(fileContent)]);
	} catch (error) {
		return Res.err(error as Error);
	}
}

/**
 * Parses a JSON string into an AST with location information
 */
export function parseJson(json: string): Result<JsonNode, Error> {
	// Wrap the JSON in a variable declaration to make it valid JavaScript
	const wrappedJson = `(${json})`;

	try {
		// Parse the wrapped JSON as JavaScript
		const ast = parse(wrappedJson, {
			ecmaVersion: "latest",
			sourceType: "module",
			locations: true,
			ranges: true,
		});

		// Extract the object literal
		const jsonNode = (ast.body[0] as ExpressionStatement).expression;

		return Res.ok(transformAcornAst(jsonNode));
	} catch (error) {
		return Res.err(error as Error);
	}
}

/**
 * Transforms an Acorn AST node into our simplified JSON AST format
 * This could be used if we need to transform the AST further
 */
export function transformAcornAst(node: Node): JsonNode {
	switch (node.type) {
		case "ObjectExpression": {
			return {
				type: "Object",
				properties: (node as unknown as ObjectExpression).properties.map(
					(prop) => transformAcornAst(prop as Node) as JsonPropertyNode,
				),
				loc: node.loc,
				range: node.range,
			} as JsonObjectNode;
		}

		case "ArrayExpression": {
			return {
				type: "Array",
				elements: (node as unknown as ArrayExpression).elements
					.map((elem) =>
						elem ? (transformAcornAst(elem as Node) as JsonValueNode) : null,
					)
					.filter(Boolean),
				loc: node.loc,
				range: node.range,
			} as JsonArrayNode;
		}

		case "Property": {
			const prop = node as unknown as Property;
			return {
				type: "Property",
				key: transformAcornAst(prop.key as Node) as JsonStringNode,
				value: transformAcornAst(prop.value as Node) as JsonValueNode,
				kind: prop.kind,
				method: prop.method,
				shorthand: prop.shorthand,
				computed: prop.computed,
				loc: node.loc,
				range: node.range,
			} as JsonPropertyNode;
		}

		case "Literal": {
			const literal = node as unknown as Literal;

			switch (typeof literal.value) {
				case "string":
					return {
						type: "String",
						value: literal.value,
						raw: literal.raw || `"${literal.value}"`,
						loc: node.loc,
						range: node.range,
					} as JsonStringNode;

				case "number":
					return {
						type: "Number",
						value: literal.value,
						raw: literal.raw || String(literal.value),
						loc: node.loc,
						range: node.range,
					} as JsonNumberNode;

				case "boolean":
					return {
						type: "Boolean",
						value: literal.value,
						raw: literal.raw || String(literal.value),
						loc: node.loc,
						range: node.range,
					} as JsonBooleanNode;

				case "object":
					if (literal.value === null) {
						return {
							type: "Null",
							value: null,
							raw: "null",
							loc: node.loc,
							range: node.range,
						} as JsonNullNode;
					}
					break;
			}
			break;
		}
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
