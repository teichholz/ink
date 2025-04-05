import chalk from "chalk";
import { logger } from "../logger.js";
import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isPropertyNode,
	isStringNode,
	parseJson,
} from "./parse-json.js";

type SyntaxHighlighting = {
	PROPERTY: (x: string) => string;
	STRING: (x: string) => string;
	NUMBER: (x: string) => string;
	BOOLEAN: (x: string) => string;
	NULL: (x: string) => string;
	ARRAY: (x: string) => string;
	OBJECT: (x: string) => string;
};

const ChalkHighlighting = {
	PROPERTY: chalk.blue,
	STRING: chalk.green,
	NUMBER: chalk.yellow,
	BOOLEAN: chalk.yellow,
	NULL: chalk.red,
	ARRAY: chalk.grey,
	OBJECT: chalk.grey,
};

const NoHighlighting = {
	PROPERTY: (x: string) => x,
	STRING: (x: string) => x,
	NUMBER: (x: string) => x,
	BOOLEAN: (x: string) => x,
	NULL: (x: string) => x,
	ARRAY: (x: string) => x,
	OBJECT: (x: string) => x,
};

/**
 * Syntax highlighting options
 */
export type SyntaxHighlightOptions = {
	syntax?: SyntaxHighlighting;
	highlightNode?: (node: JsonNode) => boolean;
};

/**
 * Essentially reparses the JSON string and highlights the nodes based on the options
 */
export function syntaxHighlight(
	jsonString: string,
	options: SyntaxHighlightOptions = {},
): [JsonNode | null, string] {
	try {
		options.syntax ??= ChalkHighlighting;
		options.highlightNode ??= () => false;
		const jsonNode = parseJson(jsonString);
		return [jsonNode, stringify(jsonNode, options)];
	} catch (error) {
		logger.error(
			{ error, jsonString },
			"Failed to parse JSON for syntax highlighting:",
		);
		return [null, jsonString];
	}
}

export type StringifyOptions = {
	depth?: number;
	syntax?: SyntaxHighlighting;
	highlightNode?: (node: JsonNode) => boolean;
};

/**
 * Converts a JSON node to a formatted string
 */
export function stringify(
	node: JsonNode,
	options: StringifyOptions = {},
): string {
	const {
		depth = 0,
		syntax = NoHighlighting,
		highlightNode = () => false,
	} = options;

	const indent = "  ".repeat(depth);
	const isHighlighted = highlightNode(node);

	// Helper to apply highlighting if needed
	const applyHighlight = (text: string) => {
		return isHighlighted ? chalk.bgGray(text) : text;
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return applyHighlight(syntax.OBJECT("{}"));
		}

		const childIndent = "  ".repeat(depth + 1);
		const properties = node.properties
			.map((prop) => {
				const key = syntax.PROPERTY(prop.key.raw);
				const value = stringify(prop.value, {
					depth: depth + 1,
					syntax,
					highlightNode,
				});

				// If the property node is highlighted, highlight just the key
				const propHighlighted = highlightNode(prop);
				const formattedKey = propHighlighted ? chalk.bgGray(key) : key;

				return `${childIndent}${formattedKey}: ${value}`;
			})
			.join(",\n");

		const openBrace = syntax.OBJECT("{\n");
		const closeBrace = `\n${indent}${syntax.OBJECT("}")}`;

		return applyHighlight(openBrace) + properties + applyHighlight(closeBrace);
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			return applyHighlight(syntax.ARRAY("[]"));
		}

		const childIndent = "  ".repeat(depth + 1);
		const elements = node.elements
			.map(
				(elem) =>
					`${childIndent}${stringify(elem, {
						depth: depth + 1,
						syntax,
						highlightNode,
					})}`,
			)
			.join(",\n");

		const openBracket = syntax.ARRAY("[\n");
		const closeBracket = `\n${indent}${syntax.ARRAY("]")}`;

		return (
			applyHighlight(openBracket) + elements + applyHighlight(closeBracket)
		);
	}

	if (isPropertyNode(node)) {
		const key = syntax.PROPERTY(node.key.raw);
		const value = stringify(node.value, {
			depth,
			syntax,
			highlightNode,
		});

		// For property nodes, we highlight just the key in the parent's context
		return `${key}: ${value}`;
	}

	if (isStringNode(node)) {
		return applyHighlight(syntax.STRING(node.raw));
	}

	if (isNumberNode(node)) {
		return applyHighlight(syntax.NUMBER(node.raw));
	}

	if (isBooleanNode(node)) {
		return applyHighlight(syntax.BOOLEAN(node.raw));
	}

	if (isNullNode(node)) {
		return applyHighlight(syntax.NULL(node.raw));
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
