import {Text} from 'ink';
import React, {ReactNode} from 'react';
import TextInput, {TextInputProps} from '../components/input.js';
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
import {LiteralUnion} from 'type-fest';
import {ForegroundColorName} from 'chalk';

const DefaultHighlighting = {
	ARRAY: (x: string) => <Text color="gray">{x}</Text>,
	OBJECT: (x: string) => <Text color="gray">{x}</Text>,
	STRING: (textInputProps: TextInputProps) => {
		return (
			<>
				<Text>"</Text>
				<TextInput {...textInputProps} />
				<Text>"</Text>
			</>
		);
	},
	PROPERTY: ColoredHighlightableText('blue'),
	NUMBER: ColoredHighlightableText('yellow'),
	BOOLEAN: ColoredHighlightableText('yellow'),
	NULL: ColoredHighlightableText('red'),
};

function ColoredHighlightableText(
	color: LiteralUnion<ForegroundColorName, string>,
) {
	return (x: string, isHighlighted: boolean) => (
		<Text backgroundColor={isHighlighted ? 'grey' : ''} color={color}>
			{x}
		</Text>
	);
}

/**
 * Syntax highlighting options
 */
export type SyntaxHighlightOptions = {
	syntax?: typeof DefaultHighlighting;

	/**
	 * Highlight node background when the curssor points to it
	 */
	highlightNode?: (node: JsonNode) => boolean;

	/**
	 * Whether to focus a string node for editing
	 */
	focusStringInput?: (node: JsonNode) => boolean;

	/**
	 * Callback when a string node has changed
	 */
	onStringChange?: (node: JsonNode, value: string) => void;

	/**
	 * Callback when a string node is submitted
	 */
	onStringSubmit?: (node: JsonNode, value: string) => void;
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
	const focusStringInput = options.focusStringInput ?? (() => false);
	const onStringChange = options.onStringChange ?? (() => {});
	const onStringSubmit = options.onStringSubmit ?? (() => {});

	return applyHighlighting(node, {
		depth: 0,
		syntax,
		highlightNode,
		focusStringInput,
		onStringChange,
		onStringSubmit,
	});
}

/**
 * Internal function that applies highlighting to a node
 */
function applyHighlighting(
	node: JsonNode,
	options: {
		depth: number;
	} & Required<SyntaxHighlightOptions>,
): ReactNode {
	const {
		depth,
		syntax,
		highlightNode,
		focusStringInput,
		onStringChange,
		onStringSubmit,
	} = options;
	const indent = '  '.repeat(depth);
	const isHighlighted = highlightNode(node);

	const staticOpts = {
		syntax,
		highlightNode,
		focusStringInput,
		onStringChange,
		onStringSubmit,
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return syntax.OBJECT('{}');
		}

		const childIndent = '  '.repeat(depth + 1);

		// React version
		const properties = node.properties.map(prop => {
			const key = syntax.PROPERTY(prop.key.raw, isHighlighted);
			const value = applyHighlighting(prop.value, {
				depth: depth + 1,
				...staticOpts,
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
			return syntax.ARRAY('[]');
		}

		const childIndent = '  '.repeat(depth + 1);

		const elements = node.elements.map(elem => {
			const value = applyHighlighting(elem, {
				depth: depth + 1,
				...staticOpts,
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
		const key = syntax.PROPERTY(node.key.raw, isHighlighted);
		const value = applyHighlighting(node.value, {
			depth,
			...staticOpts,
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
		const handleChange = (newValue: string) => {
			onStringChange(node, newValue);
		};

		return syntax.STRING({
			value: node.value,
			backgroundColor: isHighlighted ? 'grey' : '',
			onChange: handleChange,
			focus: focusStringInput?.(node),
		});
	}

	if (isNumberNode(node)) {
		return syntax.NUMBER(node.raw, isHighlighted);
	}

	if (isBooleanNode(node)) {
		return syntax.BOOLEAN(node.raw, isHighlighted);
	}

	if (isNullNode(node)) {
		return syntax.NULL(node.raw, isHighlighted);
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
