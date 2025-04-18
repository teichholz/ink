import { ForegroundColorName } from 'chalk';
import { Text } from 'ink';
import React, { ReactNode } from 'react';
import { LiteralUnion } from 'type-fest';
import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isStringNode,
} from '../json-tree/parse-json.js';
import { UncontrolledTextInput, UncontrolledTextInputProps } from './input.js';

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
	 * Range of lines to render. Inclusive.
	 */
	renderRange?: [number, number];

	indent?: number;

	/**
	 * Callback when a string node has changed
	 *
	 * @deprecated Use onStringInputSubmit instead
	 */
	onStringInputChange?: (node: JsonNode, value: string) => void;

	/**
	 * Callback when a string node is submitted
	 */
	onStringInputSubmit?: (prev: string, value: string) => void;
};

/**
 * SyntaxHighlighter component for JSON nodes
 */
export function SyntaxHighlighter({
	node,
	syntax = DefaultHighlighting,
	indent = 2,
	cursor = null,
	edit = null,
	renderRange = [0, Infinity],
	onStringInputChange = () => { },
	onStringInputSubmit = () => { },
}: SyntaxHighlightOptions): ReactNode {
	const result = applyHighlighting(0, {
		node,
		syntax,
		indent,
		cursor,
		edit,
		renderRange,
		onStringInputChange,
		onStringInputSubmit,
	});

	return result;
}

function applyHighlighting(
	depth: number,
	{
		node,
		indent: iindent,
		syntax,
		cursor,
		edit,
		renderRange,
		onStringInputChange,
		onStringInputSubmit,
	}: Required<SyntaxHighlightOptions> & { path?: string },
): ReactNode {
	const indent = ' '.repeat(depth * iindent);
	const applyCursorHighlight = (element: ReactNode, node: JsonNode) => {
		if (node === cursor) {
			return syntax.CURSORHIGHLIGHT(element);
		}
		return element;
	};
	const inRenderRange = (node: JsonNode): boolean =>
		node.loc.start.line <= renderRange[1] &&
		node.loc.end.line >= renderRange[0];

	// options that are static for the entire tree
	const staticOpts = {
		syntax,
		indent: iindent,
		cursor,
		edit,
		renderRange,
		onStringInputChange,
		onStringInputSubmit,
	};

	if (isObjectNode(node)) {
		// Always traverse the object, but conditionally render based on range
		if (node.properties.length === 0) {
			return inRenderRange(node) ? syntax.OBJECT('{}') : <Text></Text>;
		}

		const childIndent = '  '.repeat(depth + 1);

		// Check if any part of the object is in render range
		const objectInRange = inRenderRange(node);
		const propsInRenderRange = node.properties.map(prop =>
			inRenderRange(prop.key) || inRenderRange(prop.value)
		);

		// Only show braces if any part of the object is in range
		const shouldShowBraces = objectInRange && propsInRenderRange.some(Boolean);

		const properties = node.properties.map(prop => {
			const key = applyCursorHighlight(syntax.PROPERTY(prop.key.raw), prop.key);
			const value = applyHighlighting(depth + 1, {
				node: prop.value,
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

		const openBrace = shouldShowBraces ? (
			syntax.OBJECT('{\n')
		) : (
			<Text></Text>
		);
		const closeBrace = shouldShowBraces ? (
			<>
				<Text>{indent}</Text>
				{syntax.OBJECT('}')}
			</>
		) : (
			<Text></Text>
		);

		const propOrEmpty = (prop: ReactNode, i: number) => {
			if (!propsInRenderRange[i]) {
				return <Text></Text>;
			}

			return (
				<React.Fragment key={i}>
					{prop}
					{i < node.properties.length - 1 && <Text>,{'\n'}</Text>}
					{i === node.properties.length - 1 && <Text>{'\n'}</Text>}
				</React.Fragment>
			);
		};

		return (
			<React.Fragment>
				{openBrace}
				{properties.map(propOrEmpty)}
				{closeBrace}
			</React.Fragment>
		);
	}

	if (isArrayNode(node)) {
		// Always traverse the array, but conditionally render based on range
		if (node.elements.length === 0) {
			return inRenderRange(node) ? syntax.ARRAY('[]') : <Text></Text>;
		}

		const childIndent = '  '.repeat(depth + 1);

		// Check if any part of the array is in render range
		const arrayInRange = inRenderRange(node);
		const elementsInRenderRange = node.elements.map(elem => inRenderRange(elem));

		// Only show brackets if any part of the array is in range
		const shouldShowBrackets = arrayInRange && elementsInRenderRange.some(Boolean);

		const elements = node.elements.map((elem) => {
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

		const openBracket = shouldShowBrackets ? syntax.ARRAY('[\n') : <Text></Text>;
		const closeBracket = shouldShowBrackets ? syntax.ARRAY(']') : <Text></Text>;

		return (
			<React.Fragment>
				{openBracket}
				{elements.map((elem, i) => {
					if (!elementsInRenderRange[i]) {
						return <Text></Text>;
					}

					return (
						<React.Fragment key={i}>
							{elem}
							{i < node.elements.length - 1 && elementsInRenderRange[i + 1] && <Text>,{'\n'}</Text>}
							{i === node.elements.length - 1 && <Text>{'\n'}</Text>}
						</React.Fragment>
					);
				})}
				{shouldShowBrackets && <Text>{indent}</Text>}
				{closeBracket}
			</React.Fragment>
		);
	}

	if (!inRenderRange(node)) {
		return <Text></Text>;
	}

	if (isStringNode(node)) {
		return applyCursorHighlight(
			syntax.STRING({
				initialValue: node.value,
				focus: edit === node,
				onSubmit: (str) => onStringInputSubmit(node.value, str),
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
