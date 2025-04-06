import {ForegroundColorName} from 'chalk';
import {Text} from 'ink';
import React, {ReactNode, useEffect} from 'react';
import {LiteralUnion} from 'type-fest';
import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isPropertyNode,
	isStringNode,
} from '../json-tree/parse-json.js';
import TextInput, {TextInputProps} from './input.js';
import {logger} from '../logger.js';

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
	/**
	 * JSON node to highlight
	 */
	node: JsonNode;

	/**
	 * Syntax highlighting options
	 */
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
	onStringSubmit?: (node: JsonNode) => void;
};

/**
 * SyntaxHighlighter component for JSON nodes
 */
export function SyntaxHighlighter({
	node,
	syntax = DefaultHighlighting,
	highlightNode = () => false,
	focusStringInput = () => false,
	onStringChange = () => {},
	onStringSubmit = () => {},
}: SyntaxHighlightOptions): ReactNode {
	useEffect(() => {
		logger.info('SyntaxHighlighter rendered');
	}, [node]);

	return applyHighlighting(0, {
		node,
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
	depth: number,
	props: Required<SyntaxHighlightOptions>,
): ReactNode {
	const {
		node,
		syntax,
		highlightNode,
		focusStringInput,
		onStringChange,
		onStringSubmit,
	} = props;

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
			const value = applyHighlighting(depth + 1, {
				node: prop.value,
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
			const value = applyHighlighting(depth + 1, {
				node: elem,
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
		const value = applyHighlighting(depth + 1, {
			node: node.value,
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
		return syntax.STRING({
			value: node.value,
			backgroundColor: isHighlighted ? 'grey' : '',
			onChange: string => onStringChange(node, string),
			onSubmit: () => onStringSubmit(node),
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
