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
