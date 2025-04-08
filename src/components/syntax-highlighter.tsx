import {ForegroundColorName} from 'chalk';
import {Text} from 'ink';
import React, {ReactNode} from 'react';
import {LiteralUnion} from 'type-fest';
import {
	type JsonNode,
	JsonStringNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isStringNode,
} from '../json-tree/parse-json.js';
import {UncontrolledTextInput, UncontrolledTextInputProps} from './input.js';
import {logger} from '../logger.js';

const DefaultHighlighting = {
	ARRAY: ColoredText('gray'),
	OBJECT: ColoredText('gray'),
	STRING: (textInputProps: UncontrolledTextInputProps) => {
		return (
			<>
				<Text>"</Text>
				<UncontrolledTextInput {...textInputProps} />
				<Text>"</Text>
			</>
		);
	},
	PROPERTY: ColoredText('blue'),
	NUMBER: ColoredText('yellow'),
	BOOLEAN: ColoredText('yellow'),
	NULL: ColoredText('red'),
	CURSORHIGHLIGHT: (element: ReactNode) => {
		return <Text backgroundColor="grey">{element}</Text>;
	},
};

function ColoredText(color: LiteralUnion<ForegroundColorName, string>) {
	return (x: string) => <Text color={color}>{x}</Text>;
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
	 * Node to highlight with background color
	 */
	cursor?: JsonNode | null;

	/**
	 * Node to focus for string input
	 */
	edit?: JsonNode | null;

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
	cursor = null,
	edit = null,
	onStringInputChange = () => {},
	onStringInputSubmit = () => {},
}: SyntaxHighlightOptions): ReactNode {
	const result = applyHighlighting(0, {
		node,
		syntax,
		cursor,
		edit,
		onStringInputChange,
		onStringInputSubmit,
	});

	return result;
}

function applyHighlighting(
	depth: number,
	{
		node,
		path = '',
		syntax,
		cursor,
		edit,
		onStringInputChange,
		onStringInputSubmit,
	}: Required<SyntaxHighlightOptions> & {path?: string},
): ReactNode {
	const indent = '  '.repeat(depth);
	const applyCursorHighlight = (element: ReactNode, node: JsonNode) => {
		if (
			cursor &&
			node.range[0] === cursor.range[0] &&
			node.range[1] === cursor.range[1]
		) {
			return syntax.CURSORHIGHLIGHT(element);
		}
		return element;
	};

	// options that are static for the entire tree
	const staticOpts = {
		syntax,
		cursor,
		edit,
		onStringInputChange,
		onStringInputSubmit,
	};

	if (isObjectNode(node)) {
		if (node.properties.length === 0) {
			return syntax.OBJECT('{}');
		}

		const childIndent = '  '.repeat(depth + 1);

		const properties = node.properties.map(prop => {
			const key = applyCursorHighlight(syntax.PROPERTY(prop.key.raw), prop.key);
			const propPath = `${path}/${prop.key.value}`;
			const value = applyHighlighting(depth + 1, {
				node: prop.value,
				path: propPath,
				...staticOpts,
			});

			return (
				<React.Fragment key={prop.key.value}>
					<Text>{childIndent}</Text>
					{key}
					<Text>: </Text>
					{value}
				</React.Fragment>
			);
		});

		const openBrace = syntax.OBJECT('{\n');
		const closeBrace = syntax.OBJECT('}');

		return (
			<React.Fragment>
				{openBrace}
				{properties.map((prop, i) => (
					<React.Fragment key={i}>
						{prop}
						{i < node.properties.length - 1 && <Text>,{'\n'}</Text>}
						{i === node.properties.length - 1 && <Text>{'\n'}</Text>}
					</React.Fragment>
				))}
				<Text>{indent}</Text>
				{closeBrace}
			</React.Fragment>
		);
	}

	if (isArrayNode(node)) {
		if (node.elements.length === 0) {
			return syntax.ARRAY('[]');
		}

		const childIndent = '  '.repeat(depth + 1);

		const elements = node.elements.map((elem, index) => {
			const elemPath = `${path}/${index}`;
			const value = applyHighlighting(depth + 1, {
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
				{openBracket}
				{elements.map((elem, i) => (
					<React.Fragment key={i}>
						{elem}
						{i < node.elements.length - 1 && <Text>,{'\n'}</Text>}
						{i === node.elements.length - 1 && <Text>{'\n'}</Text>}
					</React.Fragment>
				))}
				<Text>{indent}</Text>
				{closeBracket}
			</React.Fragment>
		);
	}

	if (isStringNode(node)) {
		logger.info(
			{
				edit: (edit as JsonStringNode)?.value,
				node: node.value,
				equals: edit === node,
			},
			'String node',
		);
		return applyCursorHighlight(
			syntax.STRING({
				initialValue: node.value,
				focus: edit === node,
				onSubmit: () => onStringInputSubmit(node, path),
			}),
			node,
		);
	}

	if (isNumberNode(node)) {
		return applyCursorHighlight(syntax.NUMBER(node.raw), node);
	}

	if (isBooleanNode(node)) {
		return applyCursorHighlight(syntax.BOOLEAN(node.raw), node);
	}

	if (isNullNode(node)) {
		return applyCursorHighlight(syntax.NULL(node.raw), node);
	}

	throw new Error(`Unsupported node type: ${node.type}`);
}
