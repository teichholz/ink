import fs from 'fs/promises';
import {Box, Text} from 'ink';
import path from 'path';
import {useEffect, useMemo, useState} from 'react';
import {useJsonCursor} from '../hooks/useJsonCursor.js';
import {
	createKeyCombo,
	Keybinding,
	useKeybindings,
} from '../hooks/useKeybindings.js';
import {JsonValueNode, parseJson} from '../json-tree/parse-json.js';
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

	// Use the JSON cursor hook
	const {
		updateRootNode,
		updateNavigableNodes,
		moveCursorUp,
		moveCursorDown,
		isNodeAtCursor,
		getCurrentCursor,
	} = useJsonCursor(jsonTree);

	// Define keybindings
	const keybindings = useMemo<Keybinding[]>(
		() => [
			{
				key: createKeyCombo('j'),
				label: 'Move cursor down',
				action: () => {
					moveCursorDown();
					logger.info('Moved cursor down');
				},
				showInHelp: true,
			},
			{
				key: createKeyCombo('k'),
				label: 'Move cursor up',
				action: () => {
					moveCursorUp();
					logger.info('Moved cursor up');
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
		[moveCursorDown, moveCursorUp],
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

			try {
				const fileContent = await fs.readFile(filePath, 'utf-8');

				try {
					const parsedJson = parseJson(fileContent);

					// Format the JSON without syntax highlighting
					setContent(stringify(parsedJson));
					// Show non-highlighted content at the start
					setHighlightedContent(content);

					// logger.info('Set highlighted content');

					// Parse the stringified content back to have correct locations
					setError(null);
				} catch (parseError) {
					setJsonTree(null);
					setError(
						parseError instanceof Error
							? parseError
							: new Error(String(parseError)),
					);
				}
			} catch (fileError) {
				setContent('');
				setJsonTree(null);
				setError(
					fileError instanceof Error ? fileError : new Error(String(fileError)),
				);
			}
		};

		loadFile();
	}, [filePath]);

	// reparse and syntax highlight on change
	useEffect(() => {
		if (!content) {
			return;
		}

		logger.info({cursor: getCurrentCursor()}, 'Current cursor position');
		const [jsonTree, highlightedContent] = syntaxHighlight(content, {
			highlightNode: isNodeAtCursor,
		});
		setHighlightedContent(highlightedContent);
		setJsonTree(jsonTree as JsonValueNode);
		updateRootNode(jsonTree as JsonValueNode);
		updateNavigableNodes();
	}, [content, isNodeAtCursor]);

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
