import type {
	ArrayExpression,
	Expression,
	Literal,
	Node,
	ObjectExpression,
	Program,
	Property,
	VariableDeclaration,
} from "acorn";
import { parse } from "acorn";
import chalk from "chalk";

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
	start: Position;
	end: Position;
}

/**
 * Base interface for all JSON AST nodes
 */
export interface JsonNode {
	type: string;
	loc: Location;
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
 * Parses a JSON string into an AST with location information
 */
export function parseJson(json: string): JsonNode {
	// Wrap the JSON in a variable declaration to make it valid JavaScript
	const wrappedJson = `const jsonData = ${json};`;

	// Parse the wrapped JSON as JavaScript
	const ast = parse(wrappedJson, {
		ecmaVersion: "latest",
		sourceType: "module",
		locations: true,
	});

	// Extract the object literal node from the variable declaration
	// The AST structure is: Program > VariableDeclaration > VariableDeclarator > ObjectExpression
	const program = ast as Program;
	const variableDeclaration = program.body[0] as VariableDeclaration;
	const variableDeclarator = variableDeclaration.declarations[0];
	const objectExpression = variableDeclarator.init as Expression;

	return transformAcornAst(objectExpression);
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
					} as JsonStringNode;

				case "number":
					return {
						type: "Number",
						value: literal.value,
						raw: literal.raw || String(literal.value),
						loc: node.loc,
					} as JsonNumberNode;

				case "boolean":
					return {
						type: "Boolean",
						value: literal.value,
						raw: literal.raw || String(literal.value),
						loc: node.loc,
					} as JsonBooleanNode;

				case "object":
					if (literal.value === null) {
						return {
							type: "Null",
							value: null,
							raw: "null",
							loc: node.loc,
						} as JsonNullNode;
					}
					break;
			}
			break;
		}
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}

const SyntaxHighlighting = {
	PROPERTY: chalk.blue,
	STRING: chalk.green,
	NUMBER: chalk.yellow,
	BOOLEAN: chalk.yellow,
	NULL: chalk.red,
	ARRAY: chalk.grey,
	OBJECT: chalk.grey,
};

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

export type StringifyOptions = {
	depth?: number;
	syntax?: typeof SyntaxHighlighting;
	highlightNode?: (node: JsonNode) => boolean;
	currentLine?: number;
	currentColumn?: number;
};

/**
 * Stringifies a JSON node with syntax highlighting and location tracking
 * @param node The JSON node to stringify
 * @param options Stringify options including location tracking
 * @returns The stringified JSON
 */
export function stringify(
	node: JsonNode,
	options: StringifyOptions = {},
): string {
	const {
		depth = 0,
		syntax = SyntaxHighlighting,
		highlightNode = () => false,
		currentLine = 1,
		currentColumn = 0,
	} = options;

	const indent = "  ".repeat(depth);
	const isHighlighted = highlightNode(node);

	// Helper to apply highlighting if needed
	const applyHighlight = (text: string) => {
		return isHighlighted ? chalk.bgGray(text) : text;
	};

	// Always update node location
	node.loc.start.line = currentLine;
	node.loc.start.column = currentColumn;

	let line = currentLine;
	let column = currentColumn;

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			const result = applyHighlight(syntax.OBJECT("{}"));
			
			column += 2; // Length of "{}"
			node.loc.end.line = line;
			node.loc.end.column = column;
			
			return result;
		}

		const childIndent = "  ".repeat(depth + 1);
		let propertiesText = "";
		
		// Track current position
		line++; // Account for the opening brace and newline
		column = childIndent.length;
		
		for (let i = 0; i < node.properties.length; i++) {
			const prop = node.properties[i];
			const key = syntax.PROPERTY(prop.key.raw);
			
			// Always update property key location
			prop.key.loc.start.line = line;
			prop.key.loc.start.column = column;
			prop.key.loc.end.line = line;
			prop.key.loc.end.column = column + prop.key.raw.length;
			
			// Update property node start location
			prop.loc.start.line = line;
			prop.loc.start.column = column;
			
			// Calculate new position after key and colon
			column += prop.key.raw.length + 2; // +2 for ": "
			
			// Stringify the value with updated position
			const value = stringify(prop.value, {
				depth: depth + 1,
				syntax,
				highlightNode,
				currentLine: line,
				currentColumn: column,
			});

			// If the property node is highlighted, highlight just the key
			const propHighlighted = highlightNode(prop);
			const formattedKey = propHighlighted ? chalk.bgGray(key) : key;
			
			const propText = `${childIndent}${formattedKey}: ${value}`;
			propertiesText += propText;
			
			// Always update property end location
			prop.loc.end.line = prop.value.loc.end.line;
			prop.loc.end.column = prop.value.loc.end.column;
			
			// Add comma and newline if not the last property
			if (i < node.properties.length - 1) {
				propertiesText += ",\n";
				line++;
				column = childIndent.length;
			}
		}

		const openBrace = syntax.OBJECT("{\n");
		const closeBrace = `\n${indent}${syntax.OBJECT("}")}`;
		
		// Always update end location
		line++; // Account for the final newline
		column = indent.length + 1; // +1 for the closing brace
		node.loc.end.line = line;
		node.loc.end.column = column;

		return applyHighlight(openBrace) + propertiesText + applyHighlight(closeBrace);
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			const result = applyHighlight(syntax.ARRAY("[]"));
			
			column += 2; // Length of "[]"
			node.loc.end.line = line;
			node.loc.end.column = column;
			
			return result;
		}

		const childIndent = "  ".repeat(depth + 1);
		let elementsText = "";
		
		// Track current position
		line++; // Account for the opening bracket and newline
		column = childIndent.length;
		
		for (let i = 0; i < node.elements.length; i++) {
			const elem = node.elements[i];
			
			// Stringify the element with updated position
			const elemText = stringify(elem, {
				depth: depth + 1,
				syntax,
				highlightNode,
				currentLine: line,
				currentColumn: column,
			});
			
			elementsText += `${childIndent}${elemText}`;
			
			// Add comma and newline if not the last element
			if (i < node.elements.length - 1) {
				elementsText += ",\n";
				line++;
				column = childIndent.length;
			}
		}

		const openBracket = syntax.ARRAY("[\n");
		const closeBracket = `\n${indent}${syntax.ARRAY("]")}`;
		
		// Always update end location
		line++; // Account for the final newline
		column = indent.length + 1; // +1 for the closing bracket
		node.loc.end.line = line;
		node.loc.end.column = column;

		return applyHighlight(openBracket) + elementsText + applyHighlight(closeBracket);
	}

	if (isPropertyNode(node)) {
		const key = syntax.PROPERTY(node.key.raw);
		
		// Always update key location
		node.key.loc.start.line = line;
		node.key.loc.start.column = column;
		node.key.loc.end.line = line;
		node.key.loc.end.column = column + node.key.raw.length;
		
		// Calculate new position after key and colon
		column += node.key.raw.length + 2; // +2 for ": "
		
		const value = stringify(node.value, {
			depth,
			syntax,
			highlightNode,
			currentLine: line,
			currentColumn: column,
		});

		// For property nodes, we highlight just the key in the parent's context
		return `${key}: ${value}`;
	}

	if (isStringNode(node)) {
		const result = applyHighlight(syntax.STRING(node.raw));
		
		column += node.raw.length;
		node.loc.end.line = line;
		node.loc.end.column = column;
		
		return result;
	}

	if (isNumberNode(node)) {
		const result = applyHighlight(syntax.NUMBER(node.raw));
		
		column += node.raw.length;
		node.loc.end.line = line;
		node.loc.end.column = column;
		
		return result;
	}

	if (isBooleanNode(node)) {
		const result = applyHighlight(syntax.BOOLEAN(node.raw));
		
		column += node.raw.length;
		node.loc.end.line = line;
		node.loc.end.column = column;
		
		return result;
	}

	if (isNullNode(node)) {
		const result = applyHighlight(syntax.NULL(node.raw));
		
		column += 4; // Length of "null"
		node.loc.end.line = line;
		node.loc.end.column = column;
		
		return result;
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
