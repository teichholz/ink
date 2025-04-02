import fs from 'fs/promises';
import {Box, Text, useInput} from 'ink';
import path from 'path';
import {useEffect, useState} from 'react';
import {useJsonCursor} from '../hooks/useJsonCursor.js';
import {JsonValueNode, parseJson, stringify} from '../json-tree/json-tree.js';

type JsonEditorProps = {
	/**
	 * Path to the JSON file to edit
	 */
	filePath: string | null;
};

export function JsonEditor({filePath}: JsonEditorProps) {
	const [content, setContent] = useState<string>('');
	const [jsonTree, setJsonTree] = useState<JsonValueNode | null>(null);
	const [error, setError] = useState<Error | null>(null);

	// Use the JSON cursor hook
	const {updateNavigableNodes, moveCursorUp, moveCursorDown, isNodeAtCursor} =
		useJsonCursor(jsonTree);

	// Handle keyboard input
	useInput((input, _key) => {
		if (input === 'j') {
			moveCursorDown();
		} else if (input === 'k') {
			moveCursorUp();
		}
	});

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
					setJsonTree(parsedJson as JsonValueNode);

					// Format the JSON with syntax highlighting
					setContent(
						stringify(parsedJson, {
							highlightNode: isNodeAtCursor,
						}),
					);

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

	// Initialize navigable nodes when JSON tree changes
	useEffect(() => {
		if (jsonTree) {
			updateNavigableNodes();
		}
	}, [jsonTree, updateNavigableNodes]);

	// Update content when cursor position changes
	useEffect(() => {
		if (jsonTree) {
			setContent(
				stringify(jsonTree, {
					highlightNode: isNodeAtCursor,
				}),
			);
		}
	}, [jsonTree, isNodeAtCursor]);

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
			<Text>Use j/k to navigate</Text>
			<Box marginTop={1} flexDirection="column">
				{content.split('\n').map((line, index) => (
					<Text key={index}>{line}</Text>
				))}
			</Box>
		</Box>
	);
}
