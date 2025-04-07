import {Box, Text} from 'ink';
import path from 'path';
import {useEffect, useMemo, useState} from 'react';
import {useAtom} from 'jotai';
import {addJsonEditAtom} from '../atoms/json-editor-atoms.js';
import {Key, Keybinding, useKeybindings} from '../hooks/useKeybindings.js';
import {
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isPropertyNode,
	isStringNode,
	JsonNode,
	JsonValueNode,
	parseJson,
	parseJsonFile,
} from '../json-tree/parse-json.js';
import {stringify} from '../json-tree/syntax-highlight.js';
import {logger} from '../logger.js';
import {SyntaxHighlighter} from './syntax-highlighter.js';
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

	// Define a type for cursor position that includes path information
	type CursorPosition = {
		index: number;
		path: string;
	};

	const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
		index: 0,
		path: '/',
	});
	const [navigableNodes, setNavigableNodes] = useState<
		Array<{node: JsonNode; path: string}>
	>([]);

	// Function to collect all navigable nodes from the JSON tree with their paths
	const collectNavigableNodes = (
		node: JsonNode | null,
		currentPath: string = '/',
	): Array<{node: JsonNode; path: string}> => {
		if (!node) return [];

		const nodes: Array<{node: JsonNode; path: string}> = [
			{node, path: currentPath},
		];

		if (isObjectNode(node)) {
			// Add all property keys (but not primitive values)
			node.properties.forEach((prop, _index) => {
				const propPath = `${currentPath}/${prop.key.value}`;
				nodes.push({node: prop, path: propPath});

				// For non-primitive values, add their children too
				if (!isPrimitiveValueNode(prop.value)) {
					const valueNodes = collectNavigableNodes(prop.value, propPath);
					if (valueNodes.length > 0) {
						nodes.push(...valueNodes);
					}
				}
			});
		} else if (isArrayNode(node)) {
			// Add all array elements
			node.elements.forEach((elem, index) => {
				const elemPath = `${currentPath}/${index}`;
				nodes.push(...collectNavigableNodes(elem, elemPath));
			});
		}

		return nodes;
	};

	const isPrimitiveValueNode = (node: JsonNode): boolean => {
		return (
			isStringNode(node) ||
			isNumberNode(node) ||
			isBooleanNode(node) ||
			isNullNode(node)
		);
	};

	// Define keybindings
	const keybindings = useMemo<Keybinding[]>(
		() => [
			{
				key: Key.create('j'),
				label: 'Move cursor down',
				action: () => {
					if (navigableNodes.length > 0) {
						setCursorPosition(prev => {
							const newIndex =
								prev.index >= navigableNodes.length - 1 ? 0 : prev.index + 1;
							return {
								index: newIndex,
								path: navigableNodes[newIndex].path,
							};
						});
						logger.info({cursorPosition}, 'Moved cursor down');
					}
				},
				showInHelp: true,
			},
			{
				key: Key.create('k'),
				label: 'Move cursor up',
				action: () => {
					if (navigableNodes.length > 0) {
						setCursorPosition(prev => {
							const newIndex =
								prev.index <= 0 ? navigableNodes.length - 1 : prev.index - 1;
							return {
								index: newIndex,
								path: navigableNodes[newIndex].path,
							};
						});
						logger.info({cursorPosition}, 'Moved cursor up');
					}
				},
				showInHelp: true,
			},
			{
				key: Key.create('r'),
				label: 'Edit string',
				action: () => {
					logger.info({cursorPosition}, 'Editing string');
					const currentNode = navigableNodes[cursorPosition.index].node;
					if (isStringNode(currentNode)) {
						setFocusedNode(currentNode);
					} else if (isPropertyNode(currentNode)) {
						setFocusedNode(currentNode.value);
					} else {
						logger.error('Unexpected node type for editing strings');
					}
				},
				predicate: () => {
					if (navigableNodes.length === 0) return false;
					const currentNode = navigableNodes[cursorPosition.index].node;
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
		[navigableNodes.length, cursorPosition.index, cursorPosition.path],
	);

	// Use keybindings hook
	useKeybindings(keybindings, id);

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
			setCursorPosition({index: 0, path: '/'});
		};

		loadFile();
	}, [filePath]);

	// Update navigable nodes when JSON tree changes
	useEffect(() => {
		if (!jsonTree) {
			return;
		}

		const nodes = collectNavigableNodes(jsonTree);
		setNavigableNodes(nodes);
	}, [jsonTree]);

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
			{navigableNodes.length > 0 && (
				<Text color="gray">Current path: {cursorPosition.path}</Text>
			)}
			<Box marginTop={1} flexDirection="column">
				<Text>
					<SyntaxHighlighter
						node={jsonTree}
						highlightedNode={
							navigableNodes.length > 0 &&
							cursorPosition.index < navigableNodes.length
								? navigableNodes[cursorPosition.index].node
								: null
						}
						focusedNode={focusedNode}
						onStringInputChange={(node: JsonNode, value: string) => {
							logger.info({value}, 'Edited value');

							if (isStringNode(node)) {
								// Create a new copy of the JSON tree to trigger re-render
								const updatedTree = {...jsonTree};
								node.value = value;
								setJsonTree(updatedTree);
							} else {
								logger.error('Unexpected node type for onStringChange');
							}
						}}
						onStringInputSubmit={(node: JsonNode) => {
							logger.info('Submitted string');

							const nodeEntry = navigableNodes.find(entry => {
								if (isPropertyNode(entry.node)) {
									return entry.node.value === node;
								} else if (isStringNode(entry.node)) {
									return entry.node === node;
								}

								return false;
							});

							const nodePath = nodeEntry?.path ?? 'unknown';

							if (nodePath === 'unknown') {
								logger.error({nodeEntry}, 'Unexpected node path');
								return;
							}

							if (isStringNode(node)) {
								const originalValue = getJsonPointer(
									originalJson,
									nodePath,
								) as string;
								addStringChange({
									path: nodePath,
									value: node.value,
									originalValue: originalValue,
									filePath: filePath,
								});
								logger.info(
									{path: nodePath, value: node.value, filePath},
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
