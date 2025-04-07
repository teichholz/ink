import {ForegroundColorName} from 'chalk';
import {Text} from 'ink';
import React, {ReactNode, useEffect} from 'react';
import {LiteralUnion} from 'type-fest';
import {countHighlightableNodes, isPrimitive} from '../json-tree/json-util.js';
import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isStringNode,
} from '../json-tree/parse-json.js';
import {logger} from '../logger.js';
import {UncontrolledTextInput, UncontrolledTextInputProps} from './input.js';

const DefaultHighlighting = {
	ARRAY: (x: string) => <Text color="gray">{x}</Text>,
	OBJECT: (x: string) => <Text color="gray">{x}</Text>,
	STRING: (textInputProps: UncontrolledTextInputProps) => {
		return (
			<>
				<Text>"</Text>
				<UncontrolledTextInput {...textInputProps} />
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
	 *
	 * @deprecated Use onStringInputSubmit instead
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

	const prevCursorRef = React.useRef<{
		index: number;
		path: string;
		node: JsonNode | null;
	}>({
		index: 0,
		path: '/',
		node: null,
	});

	const ctr = {count: 0};
	const count = countHighlightableNodes(node);
	const modCursor = cursor % count;
	const result = applyHighlighting(0, ctr, {
		node,
		syntax,
		cursor: modCursor <= 0 ? count - modCursor : modCursor,
		onCursorChange: newCursor => {
			const prevCursor = prevCursorRef.current;
			if (
				newCursor.index !== prevCursor.index ||
				newCursor.path !== prevCursor.path ||
				newCursor.node !== prevCursor.node
			) {
				prevCursorRef.current = newCursor;
				onCursorChange(newCursor);
			}
		},
		focusedNode,
		onStringInputChange,
		onStringInputSubmit,
	});

	return result;
}

function applyHighlighting(
	depth: number,
	ctr: {count: number},
	{
		node,
		path = '',
		syntax,
		cursor,
		onCursorChange,
		focusedNode,
		onStringInputChange,
		onStringInputSubmit,
		canHighlight = true,
	}: Required<SyntaxHighlightOptions> & {path?: string; canHighlight?: boolean},
): ReactNode {
	const indent = '  '.repeat(depth);

	const isHighlighted = () => canHighlight && ctr.count === cursor;

	if (ctr.count === cursor) {
		onCursorChange({index: cursor, path: path, node: node});
	}

	// options that are static for the entire tree
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
				canHighlight: !isPrimitive(prop.value),
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

	if (isStringNode(node)) {
		return syntax.STRING({
			initialValue: node.value,
			backgroundColor: isHighlighted() ? 'grey' : '',
			focus: node === focusedNode,
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
