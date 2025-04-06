import chalk from 'chalk';
import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isPropertyNode,
	isStringNode,
} from './parse-json.js';

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

/**
 * Syntax highlighting options
 */
export type SyntaxHighlightOptions = {
	syntax?: SyntaxHighlighting;
	highlightNode?: (node: JsonNode) => boolean;
};

/**
 * Applies syntax highlighting to a JSON node
 */
export function syntaxHighlight(
	node: JsonNode,
	options: SyntaxHighlightOptions = {},
): string {
	const syntax = options.syntax ?? ChalkHighlighting;
	const highlightNode = options.highlightNode ?? (() => false);

	return applyHighlighting(node, {
		depth: 0,
		syntax,
		highlightNode,
	});
}

/**
 * Internal function that applies highlighting to a node
 */
function applyHighlighting(
	node: JsonNode,
	options: {
		depth: number;
		syntax: SyntaxHighlighting;
		highlightNode: (node: JsonNode) => boolean;
	},
): string {
	const {depth, syntax, highlightNode} = options;
	const indent = '  '.repeat(depth);
	const isHighlighted = highlightNode(node);

	// Helper to apply highlighting if needed
	const applyHighlight = (text: string) => {
		return isHighlighted ? chalk.bgGray(text) : text;
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return applyHighlight(syntax.OBJECT('{}'));
		}

		const childIndent = '  '.repeat(depth + 1);
		const properties = node.properties
			.map(prop => {
				const key = syntax.PROPERTY(prop.key.raw);
				const value = applyHighlighting(prop.value, {
					depth: depth + 1,
					syntax,
					highlightNode,
				});

				// If the property node is highlighted, highlight just the key
				const propHighlighted = highlightNode(prop);
				const formattedKey = propHighlighted ? chalk.bgGray(key) : key;

				return `${childIndent}${formattedKey}: ${value}`;
			})
			.join(',\n');

		const openBrace = syntax.OBJECT('{\n');
		const closeBrace = `\n${indent}${syntax.OBJECT('}')}`;

		return applyHighlight(openBrace) + properties + applyHighlight(closeBrace);
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			return applyHighlight(syntax.ARRAY('[]'));
		}

		const childIndent = '  '.repeat(depth + 1);
		const elements = node.elements
			.map(
				elem =>
					`${childIndent}${applyHighlighting(elem, {
						depth: depth + 1,
						syntax,
						highlightNode,
					})}`,
			)
			.join(',\n');

		const openBracket = syntax.ARRAY('[\n');
		const closeBracket = `\n${indent}${syntax.ARRAY(']')}`;

		return (
			applyHighlight(openBracket) + elements + applyHighlight(closeBracket)
		);
	}

	if (isPropertyNode(node)) {
		const key = syntax.PROPERTY(node.key.raw);
		const value = applyHighlighting(node.value, {
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

export type StringifyOptions = {
	depth?: number;
};

/**
 * Converts a JSON node to a formatted string without any highlighting
 */
export function stringify(
	node: JsonNode,
	options: StringifyOptions = {},
): string {
	const {depth = 0} = options;
	const indent = '  '.repeat(depth);

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return '{}';
		}

		const childIndent = '  '.repeat(depth + 1);
		const properties = node.properties
			.map(prop => {
				const key = prop.key.raw;
				const value = stringify(prop.value, {depth: depth + 1});
				return `${childIndent}${key}: ${value}`;
			})
			.join(',\n');

		return `{\n${properties}\n${indent}}`;
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			return '[]';
		}

		const childIndent = '  '.repeat(depth + 1);
		const elements = node.elements
			.map(elem => `${childIndent}${stringify(elem, {depth: depth + 1})}`)
			.join(',\n');

		return `[\n${elements}\n${indent}]`;
	}

	if (isPropertyNode(node)) {
		const key = node.key.raw;
		const value = stringify(node.value, {depth});
		return `${key}: ${value}`;
	}

	if (isStringNode(node)) {
		return node.raw;
	}

	if (isNumberNode(node)) {
		return node.raw;
	}

	if (isBooleanNode(node)) {
		return node.raw;
	}

	if (isNullNode(node)) {
		return node.raw;
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
