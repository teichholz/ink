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
import {logger} from '../logger.js';
import TextInput, {TextInputProps} from './input.js';

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
export type JsonCursor = {
	index: number;
	path: string;
	node: JsonNode | null;
};

/**
 * Syntax highlighting options
 */
export type SyntaxHighlightOptions = {
	/**
	 * JSON node to highlight
	 */
	node: JsonNode;

	/**
	 * Current JSON path for the node
	 */
	path?: string;

	/**
	 * Syntax highlighting options
	 */
	syntax?: typeof DefaultHighlighting;

	/**
	 * Node to highlight with background color
	 */
	cursor?: number;

	onCursorChange?: (cursor: JsonCursor) => void;

	/**
	 * Node to focus for string input
	 */
	focusedNode?: JsonNode | null;

	/**
	 * Callback when a string node has changed
	 */
	onStringInputChange?: (node: JsonNode, value: string, path: string) => void;

	/**
	 * Callback when a string node is submitted
	 */
	onStringInputSubmit?: (node: JsonNode, path: string) => void;
};

/**
 * SyntaxHighlighter component for JSON nodes
 */
export function SyntaxHighlighter({
	node,
	path = '/',
	syntax = DefaultHighlighting,
	cursor = 0,
	onCursorChange = () => {},
	focusedNode = null,
	onStringInputChange = () => {},
	onStringInputSubmit = () => {},
}: SyntaxHighlightOptions): ReactNode {
	useEffect(() => {
		logger.info('SyntaxHighlighter rendered');
	}, [node]);

	const ctr = {count: 0};

	return applyHighlighting(0, ctr, {
		node,
		path,
		syntax,
		cursor,
		onCursorChange,
		focusedNode,
		onStringInputChange,
		onStringInputSubmit,
	});
}

/**
 * Internal function that applies highlighting to a node
 */
function applyHighlighting(
	depth: number,
	ctr: {count: number},
	props: Required<SyntaxHighlightOptions>,
): ReactNode {
	const {
		node,
		path,
		syntax,
		cursor,
		onCursorChange,
		focusedNode,
		onStringInputChange,
		onStringInputSubmit,
	} = props;

	const indent = '  '.repeat(depth);
	const isHighlighted = () => ctr.count === cursor;
	
	// Only update cursor information once per render cycle
	// and only at the top level to avoid recursion
	if (isHighlighted() && depth === 0) {
		// Use setTimeout to break the synchronous call stack
		setTimeout(() => {
			onCursorChange({index: cursor, path: path, node: node});
		}, 0);
	}

	const staticOpts = {
		syntax,
		onCursorChange,
		cursor,
		focusedNode,
		onStringInputChange,
		onStringInputSubmit,
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return syntax.OBJECT('{}');
		}

		const childIndent = '  '.repeat(depth + 1);

		const properties = node.properties.map(prop => {
			ctr.count++;
			const key = syntax.PROPERTY(prop.key.raw, isHighlighted());
			const propPath = `${path}/${prop.key.value}`;
			const value = applyHighlighting(depth + 1, ctr, {
				node: prop.value,
				path: propPath,
				...staticOpts,
			});

			const formattedKey = isHighlighted() ? (
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
				{isHighlighted() ? (
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
				{isHighlighted() ? (
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

		const elements = node.elements.map((elem, index) => {
			ctr.count++;
			const elemPath = `${path}/${index}`;
			const value = applyHighlighting(depth + 1, ctr, {
				node: elem,
				path: elemPath,
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
				{isHighlighted() ? (
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
				{isHighlighted() ? (
					<Text backgroundColor="gray">{closeBracket}</Text>
				) : (
					closeBracket
				)}
			</React.Fragment>
		);
	}

	ctr.count++;
	if (isPropertyNode(node)) {
		const key = syntax.PROPERTY(node.key.raw, isHighlighted());
		const value = applyHighlighting(depth + 1, ctr, {
			node: node.value,
			path: `path/${node.key.value}`,
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
			backgroundColor: isHighlighted() ? 'grey' : '',
			focus: node === focusedNode,
			onChange: string => onStringInputChange(node, string, path),
			onSubmit: () => onStringInputSubmit(node, path),
		});
	}

	if (isNumberNode(node)) {
		return syntax.NUMBER(node.raw, isHighlighted());
	}

	if (isBooleanNode(node)) {
		return syntax.BOOLEAN(node.raw, isHighlighted());
	}

	if (isNullNode(node)) {
		return syntax.NULL(node.raw, isHighlighted());
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
