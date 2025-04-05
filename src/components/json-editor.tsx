import {Box, Text} from 'ink';
import path from 'path';
import {useEffect, useMemo, useState} from 'react';
import {
	createKeyCombo,
	Keybinding,
	useKeybindings,
} from '../hooks/useKeybindings.js';
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
import {stringify, syntaxHighlight} from '../json-tree/syntax-highlight.js';
import {logger} from '../logger.js';

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
	const [content, setContent] = useState<string>('');
	const [highlightedContent, setHighlightedContent] = useState<string>('');
	const [jsonTree, setJsonTree] = useState<JsonValueNode | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [cursorPosition, setCursorPosition] = useState<number>(0);
	const [navigableNodes, setNavigableNodes] = useState<JsonNode[]>([]);

	// Function to collect all navigable nodes from the JSON tree
	const collectNavigableNodes = (node: JsonNode | null): JsonNode[] => {
		if (!node) return [];

		const nodes: JsonNode[] = [node];

		if (isObjectNode(node)) {
			// Add all property keys (but not primitive values)
			node.properties.forEach(prop => {
				nodes.push(prop);

				// For non-primitive values, add their children too
				const valueNodes = !isPrimitiveValueNode(prop.value)
					? collectNavigableNodes(prop.value)
					: [];
				if (valueNodes.length > 0) {
					nodes.push(...valueNodes);
				}
			});
		} else if (isArrayNode(node)) {
			// Add all array elements
			node.elements.forEach(elem => {
				nodes.push(...collectNavigableNodes(elem));
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
				key: createKeyCombo('j'),
				label: 'Move cursor down',
				action: () => {
					if (navigableNodes.length > 0) {
						setCursorPosition(prev =>
							prev >= navigableNodes.length - 1 ? 0 : prev + 1,
						);
						logger.info('Moved cursor down');
					}
				},
				showInHelp: true,
			},
			{
				key: createKeyCombo('k'),
				label: 'Move cursor up',
				action: () => {
					if (navigableNodes.length > 0) {
						setCursorPosition(prev =>
							prev <= 0 ? navigableNodes.length - 1 : prev - 1,
						);
						logger.info('Moved cursor up');
					}
				},
				showInHelp: true,
			},
			{
				key: createKeyCombo('r'),
				label: 'Edit string',
				action: () => {},
				predicate: () => {
					const node = navigableNodes[cursorPosition];
					const isString = isStringNode(node);
					let isStringProperty = false;
					if (isPropertyNode(node)) {
						isStringProperty = node.value.type === 'String';
					}
					return isString || isStringProperty;
				},
				showInHelp: true,
			},
			{
				key: createKeyCombo('', ['escape']),
				label: 'Leave json editor',
				action: () => {
					logger.info('Leaving json editor');
					onExit?.();
				},
				showInHelp: true,
			},
		],
		[navigableNodes.length, cursorPosition],
	);

	// Use keybindings hook
	useKeybindings(keybindings, id);

	useEffect(() => {
		const loadFile = async () => {
			if (!filePath) {
				setContent('');
				setJsonTree(null);
				setError(null);
				return;
			}

			const [parsedJson, err] = await parseJsonFile(filePath);

			if (err) {
				logger.error({error: err}, 'Error parsing JSON file');
				setError(err);
				setJsonTree(null);
				setError(err instanceof Error ? err : new Error(String(err)));
				return;
			}

			// Format the JSON without syntax highlighting
			const formattedContent = stringify(parsedJson);
			setContent(formattedContent);

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

			// Set the JSON tree first
			setJsonTree(json as JsonValueNode);
			setError(null);

			// Initialize the highlighted content immediately with no highlights yet
			const initialHighlightedContent = syntaxHighlight(json as JsonValueNode, {
				highlightNode: () => false,
			});
			setHighlightedContent(initialHighlightedContent);

			// Reset cursor position
			setCursorPosition(0);
		};

		loadFile();
	}, [filePath]);

	const reparseContent = () => {
		if (!content) {
			return;
		}

		const [json, err] = parseJson(content);

		if (err) {
			logger.error(
				{error: err, content: content},
				'Error parsing stringified JSON',
			);
			setError(err);
			setJsonTree(null);
			setError(err instanceof Error ? err : new Error(String(err)));
			return;
		}

		logger.info('Set highlighted content due to file path change');

		// Set the JSON tree first
		setJsonTree(json as JsonValueNode);
		setError(null);
	};

	// Update json tree when content changes
	useEffect(() => {
		reparseContent();
	}, [content]);

	// Update navigable nodes when JSON tree changes
	useEffect(() => {
		if (jsonTree) {
			const nodes = collectNavigableNodes(jsonTree);
			setNavigableNodes(nodes);
			setCursorPosition(0);
		}
	}, [jsonTree]);

	// reparse and syntax highlight on change
	useEffect(() => {
		if (!jsonTree) {
			return;
		}

		// Create a predicate function to highlight the node at the current cursor position
		const highlightCurrentNode = (node: JsonNode): boolean => {
			if (
				navigableNodes.length === 0 ||
				cursorPosition >= navigableNodes.length
			) {
				return false;
			}
			return node === navigableNodes[cursorPosition];
		};

		const highlightedContent = syntaxHighlight(jsonTree, {
			highlightNode: highlightCurrentNode,
		});

		setHighlightedContent(highlightedContent);
	}, [jsonTree, cursorPosition, navigableNodes]);

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

	if (!content) {
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
			<Box marginTop={1} flexDirection="column">
				<Text>{highlightedContent}</Text>
			</Box>
		</Box>
	);
}
