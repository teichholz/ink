import {Text} from 'ink';
import React, {ReactNode} from 'react';
import TextInput from '../components/input.js';
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
	PROPERTY: (x: string) => <Text color="blue">{x}</Text>,
	STRING: (x: string, _node: JsonNode, onChange?: (value: string) => void) => {
		// Extract the actual string value without quotes
		const value = x.substring(1, x.length - 1);

		if (onChange) {
			return (
				<TextInput
					value={value}
					onChange={newValue => onChange(newValue)}
					focus={false}
				/>
			);
		}
		return <Text color="green">{x}</Text>;
	},
	NUMBER: (x: string) => <Text color="yellow">{x}</Text>,
	BOOLEAN: (x: string) => <Text color="yellow">{x}</Text>,
	NULL: (x: string) => <Text color="red">{x}</Text>,
	ARRAY: (x: string) => <Text color="gray">{x}</Text>,
	OBJECT: (x: string) => <Text color="gray">{x}</Text>,
};

/**
 * Syntax highlighting options
 */
export type SyntaxHighlightOptions = {
	syntax?: SyntaxHighlighting;
	highlightNode?: (node: JsonNode) => boolean;
	onStringChange?: (node: JsonNode, value: string) => void;
};

/**
 * Applies syntax highlighting to a JSON node
 */
export function syntaxHighlight(
	node: JsonNode,
	options: SyntaxHighlightOptions = {},
): ReactNode {
	const syntax = options.syntax ?? DefaultHighlighting;
	const highlightNode = options.highlightNode ?? (() => false);
	const onStringChange = options.onStringChange;

	return applyHighlighting(node, {
		depth: 0,
		syntax,
		highlightNode,
		onStringChange,
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
		onStringChange?: (node: JsonNode, value: string) => void;
	},
): ReactNode {
	const {depth, syntax, highlightNode, onStringChange} = options;
	const indent = '  '.repeat(depth);
	const isHighlighted = highlightNode(node);

	// Helper to apply highlighting if needed
	const applyHighlight = (element: ReactNode) => {
		// For React nodes, we'll handle highlighting in the component
		return element;
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return applyHighlight(syntax.OBJECT('{}'));
		}

		const childIndent = '  '.repeat(depth + 1);

		// React version
		const properties = node.properties.map(prop => {
			const key = syntax.PROPERTY(prop.key.raw);
			const value = applyHighlighting(prop.value, {
				depth: depth + 1,
				syntax,
				highlightNode,
				onStringChange,
			});

			// If the property node is highlighted, highlight just the key
			const propHighlighted = highlightNode(prop);
			const formattedKey = propHighlighted ? (
				<Text backgroundColor="gray">{key}</Text>
			) : (
				key
			);

			return (
				<React.Fragment key={prop.key.value}>
					<Text>{childIndent}</Text>
					{formattedKey}
					<Text>: </Text>
					{value}
				</React.Fragment>
			);
		});

		const openBrace = syntax.OBJECT('{\n');
		const closeBrace = syntax.OBJECT('}');

		return (
			<React.Fragment>
				{isHighlighted ? (
					<Text backgroundColor="gray">{openBrace}</Text>
				) : (
					openBrace
				)}
				{properties.map((prop, i) => (
					<React.Fragment key={i}>
						{prop}
						{i < node.properties.length - 1 && <Text>,{'\n'}</Text>}
						{i === node.properties.length - 1 && <Text>{'\n'}</Text>}
					</React.Fragment>
				))}
				<Text>{indent}</Text>
				{isHighlighted ? (
					<Text backgroundColor="gray">{closeBrace}</Text>
				) : (
					closeBrace
				)}
			</React.Fragment>
		);
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			return applyHighlight(syntax.ARRAY('[]'));
		}

		const childIndent = '  '.repeat(depth + 1);

		// React version
		const elements = node.elements.map(elem => {
			const value = applyHighlighting(elem, {
				depth: depth + 1,
				syntax,
				highlightNode,
				onStringChange,
			});

			return (
				<React.Fragment>
					<Text>{childIndent}</Text>
					{value}
				</React.Fragment>
			);
		});

		const openBracket = syntax.ARRAY('[\n');
		const closeBracket = syntax.ARRAY(']');

		return (
			<React.Fragment>
				{isHighlighted ? (
					<Text backgroundColor="gray">{openBracket}</Text>
				) : (
					openBracket
				)}
				{elements.map((elem, i) => (
					<React.Fragment key={i}>
						{elem}
						{i < node.elements.length - 1 && <Text>,{'\n'}</Text>}
						{i === node.elements.length - 1 && <Text>{'\n'}</Text>}
					</React.Fragment>
				))}
				<Text>{indent}</Text>
				{isHighlighted ? (
					<Text backgroundColor="gray">{closeBracket}</Text>
				) : (
					closeBracket
				)}
			</React.Fragment>
		);
	}

	if (isPropertyNode(node)) {
		const key = syntax.PROPERTY(node.key.raw);
		const value = applyHighlighting(node.value, {
			depth,
			syntax,
			highlightNode,
			onStringChange,
		});

		// For property nodes, we highlight just the key in the parent's context
		return (
			<React.Fragment>
				{key}
				<Text>: </Text>
				{value}
			</React.Fragment>
		);
	}

	if (isStringNode(node)) {
		// For React components, we pass the node and onChange handler
		const handleChange = onStringChange
			? (newValue: string) => onStringChange(node, newValue)
			: undefined;

		return applyHighlight(syntax.STRING(node.raw, node, handleChange));
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
