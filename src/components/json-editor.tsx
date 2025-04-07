import {Box, Text} from 'ink';
import path from 'path';
import {useEffect, useMemo, useState} from 'react';
import {useAtom} from 'jotai';
import {addJsonEditAtom} from '../atoms/json-editor-atoms.js';
import {Key, Keybinding, useKeybindings} from '../hooks/useKeybindings.js';
import {
	isPropertyNode,
	isStringNode,
	JsonNode,
	JsonValueNode,
	parseJson,
	parseJsonFile,
} from '../json-tree/parse-json.js';
import {stringify} from '../json-tree/syntax-highlight.js';
import {logger} from '../logger.js';
import {JsonCursor, SyntaxHighlighter} from './syntax-highlighter.js';
import {getJsonPointer, JSONValue} from '../jsonpath.js';

type JsonEditorProps = {
	/**
	 * ID for the component
	 */

	id: string;
	/**
	 * Path to the JSON file to edit
	 */
	filePath: string | null;

	/**
	 * Callback when exiting the editor
	 */
	onExit?: () => void;
};

export function JsonEditor({id, filePath, onExit}: JsonEditorProps) {
	const [originalJson, setOriginalJson] = useState<JSONValue | null>(null);
	const [jsonTree, setJsonTree] = useState<JsonValueNode | null>(null);
	const [focusedNode, setFocusedNode] = useState<JsonNode | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [, addStringChange] = useAtom(addJsonEditAtom);

	const [cursor, setCursor] = useState<JsonCursor>({
		index: 0,
		path: '/',
		node: null,
	});

	useEffect(() => {
		const loadFile = async () => {
			if (!filePath) {
				setJsonTree(null);
				setError(null);
				return;
			}

			const [parsed, err] = await parseJsonFile(filePath);

			if (err) {
				logger.error({error: err}, 'Error parsing JSON file');
				setError(err);
				setJsonTree(null);
				setError(err instanceof Error ? err : new Error(String(err)));
				return;
			}

			const [parsedJson, originalJson] = parsed;

			setOriginalJson(originalJson);

			// Format the JSON without syntax highlighting
			const formattedContent = stringify(parsedJson);

			// Reparse since stringify changed the formatting and we need the correct locations
			const [json, err2] = parseJson(formattedContent);

			if (err2) {
				logger.error(
					{error: err2, content: formattedContent},
					'Error parsing stringified JSON',
				);
				setError(err2);
				setJsonTree(null);
				setError(err2 instanceof Error ? err2 : new Error(String(err2)));
				return;
			}

			logger.info('Set highlighted content due to file path change');

			setJsonTree(json as JsonValueNode);
			setError(null);
			setCursor({index: 0, path: '/', node: null});
		};

		loadFile();
	}, [filePath]);

	const keybindings = useMemo<Keybinding[]>(
		() => [
			{
				key: Key.create('j'),
				label: 'Move cursor down',
				action: () => {
					setCursor(prev => ({...prev, index: prev.index + 1}));
				},
				showInHelp: true,
			},
			{
				key: Key.create('k'),
				label: 'Move cursor up',
				action: () => {
					setCursor(prev => ({...prev, index: prev.index - 1}));
				},
				showInHelp: true,
			},
			{
				key: Key.create('r'),
				label: 'Edit string',
				action: () => {
					logger.info({cursor}, 'Editing string');

					if (!cursor.node) {
						logger.error('No node for cursor');
						return;
					}

					const currentNode = cursor.node;
					if (isStringNode(currentNode)) {
						setFocusedNode(currentNode);
					} else if (isPropertyNode(currentNode)) {
						setFocusedNode(currentNode.value);
					} else {
						logger.error('Unexpected node type for editing strings');
					}
				},
				predicate: () => {
					if (!cursor.node) {
						return false;
					}

					const currentNode = cursor.node;
					const isString = isStringNode(currentNode);
					let isStringProperty = false;
					if (isPropertyNode(currentNode)) {
						isStringProperty = currentNode.value.type === 'String';
					}
					return isString || isStringProperty;
				},
				showInHelp: true,
			},
			{
				key: Key.modifier('escape'),
				label: 'Leave json editor',
				action: () => {
					logger.info('Leaving json editor');
					onExit?.();
				},
				showInHelp: true,
			},
		],
		[cursor],
	);

	// Use keybindings hook
	useKeybindings(keybindings, id);

	if (error) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red">Error loading JSON file:</Text>
				<Text color="red">{error.message}</Text>
			</Box>
		);
	}

	if (!filePath) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>No file selected</Text>
			</Box>
		);
	}

	if (!jsonTree) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>Loading...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={0}>
			<Text>Editing: {path.basename(filePath)}</Text>
			<Text>Use j/k to navigate, Esc to exit</Text>
			{cursor.path && <Text color="gray">Current path: {cursor.path}</Text>}
			<Box marginTop={1} flexDirection="column">
				<Text>
					<SyntaxHighlighter
						node={jsonTree}
						cursor={cursor.index}
						focusedNode={focusedNode}
						onCursorChange={(change: JsonCursor) => {
							setCursor(change);
						}}
						onStringInputChange={(
							node: JsonNode,
							value: string,
							path: string,
						) => {
							logger.info({value, path}, 'Edited value');

							if (isStringNode(node)) {
								// Create a new copy of the JSON tree to trigger re-render
								const updatedTree = {...jsonTree};
								node.value = value;
								setJsonTree(updatedTree);
							} else {
								logger.error('Unexpected node type for onStringChange');
							}
						}}
						onStringInputSubmit={(node: JsonNode, path: string) => {
							logger.info({path}, 'Submitted string');

							if (isStringNode(node)) {
								const originalValue = getJsonPointer(
									originalJson,
									path,
								) as string;
								addStringChange({
									path: path,
									value: node.value,
									originalValue: originalValue,
									filePath: filePath,
								});
								logger.info(
									{path, value: node.value, filePath},
									'Saved string change',
								);
							}

							setFocusedNode(null);
						}}
					/>
				</Text>
			</Box>
		</Box>
	);
}
