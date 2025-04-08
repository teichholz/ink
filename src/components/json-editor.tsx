import Fuse from 'fuse.js';
import {Box, Spacer, Text, useInput} from 'ink';
import {useAtom} from 'jotai';
import path from 'path';
import {useEffect, useMemo, useState} from 'react';
import {addJsonEditAtom} from '../atoms/json-editor-atoms.js';
import {Key, Keybinding, useKeybindings} from '../hooks/useKeybindings.js';
import {
	getNavigableNodes,
	isPrimitive,
	NavigableNode,
} from '../json-tree/json-util.js';
import {
	isPropertyNode,
	isStringNode,
	JsonNode,
	JsonValueNode,
	parseJson,
	parseJsonFile,
} from '../json-tree/parse-json.js';
import {stringify} from '../json-tree/syntax-highlight.js';
import {getJsonPointer, JSONValue} from '../jsonpath.js';
import {logger} from '../logger.js';
import TextInput from './input.js';
import {SyntaxHighlighter} from './syntax-highlighter.js';

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

type JsonCursor = {
	path: string;
	index?: number;
	node?: JsonNode;
};

type Search = {
	query: string;
	doSearch: boolean;
};

export function JsonEditor({id, filePath, onExit}: JsonEditorProps) {
	const [originalJson, setOriginalJson] = useState<JSONValue | null>(null);
	const [jsonTree, setJsonTree] = useState<JsonValueNode | null>(null);
	const [focusedNode, setFocusedNode] = useState<JsonNode | null>(null);
	const [navigableNodes, setNavigableNodes] = useState<NavigableNode[]>([]);
	const [error, setError] = useState<Error | null>(null);
	const [, addStringChange] = useAtom(addJsonEditAtom);

	const [cursor, setCursor] = useState<JsonCursor>({
		path: '/',
	});

	const [search, setSearch] = useState<Search>({
		query: '',
		doSearch: false,
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
			const navigable = getNavigableNodes(json);
			setNavigableNodes(navigable);
			setCursor({path: '/', index: 0, node: navigable[0].node});
			setError(null);
		};

		loadFile();
	}, [filePath]);

	/**
	 * Fuse.js instance for fuzzy search
	 *
	 * Search over both property keys and property values if the value is string / boolean / number
	 */
	const fuse = useMemo(() => {
		return new Fuse(navigableNodes, {
			getFn: (node, _) => {
				const jsonNode = node.node;
				if (isPrimitive(jsonNode)) {
					// @ts-ignore
					return String(jsonNode.value);
				}

				if (isPropertyNode(jsonNode)) {
					const keyval = jsonNode.key.value;
					let valval: string[] = [];
					if (isPrimitive(jsonNode.value)) {
						// @ts-ignore
						valval = [jsonNode.value.value];
					}
					return [keyval, ...valval];
				}

				return [];
			},
			threshold: 0.4,
			isCaseSensitive: false,
			useExtendedSearch: true,
		});
	}, [navigableNodes]);

	const keybindings = useMemo<Keybinding[]>(
		() => [
			{
				key: Key.create('j'),
				label: 'Move cursor down',
				action: () => {
					logger.info({path: cursor.path}, 'Moving cursor down');
					setCursor(prev => {
						const next = ((prev.index ?? 0) + 1) % navigableNodes.length;
						const nextNode = navigableNodes[next];
						return {index: next, node: nextNode.node, path: nextNode.path};
					});
				},
				showInHelp: true,
			},
			{
				key: Key.create('k'),
				label: 'Move cursor up',
				action: () => {
					logger.info({path: cursor.path}, 'Moving cursor up');
					setCursor(prev => {
						let next = (prev.index ?? 0) - 1;
						if (next < 0) {
							next = navigableNodes.length - 1;
						}
						const nextNode = navigableNodes[next];
						return {index: next, node: nextNode.node, path: nextNode.path};
					});
				},
				showInHelp: true,
			},
			{
				key: Key.create('r'),
				label: 'Edit string',
				action: () => {
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
				key: Key.create('/'),
				label: 'Search',
				action: () => {
					setSearch(prev => {
						return {
							...prev,
							doSearch: true,
						};
					});
				},
			},
			{
				key: Key.modifier('return'),
				label: 'Leave search',
				action: () => {
					setSearch(prev => {
						return {
							...prev,
							doSearch: false,
						};
					});
				},
				predicate: () => search.doSearch,
			},
			{
				key: Key.modifier('escape'),
				label: search.doSearch ? 'Leave search' : 'Leave json editor',
				action: () => {
					if (search.doSearch) {
						setSearch(prev => {
							return {
								...prev,
								doSearch: false,
							};
						});
						return;
					}

					logger.info('Leaving json editor');
					onExit?.();
				},
				showInHelp: true,
			},
		],
		[cursor, navigableNodes, search],
	);

	useInput((_, mod) => {
		if (mod.escape) {
			return;
		}
	});
	useKeybindings(keybindings, id);

	useEffect(() => {
		if (!search.query) {
			return;
		}

		try {
			const searched = fuse.search(search.query);
			const winner = searched[0]?.item;
			setCursor(winner);
		} catch (error) {
			return;
		}
	}, [search.query]);

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
						cursor={
							cursor.node
								? isPropertyNode(cursor.node)
									? cursor.node.key
									: cursor.node
								: null
						}
						edit={focusedNode}
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
				{search.doSearch && (
					<Box flexDirection="column">
						<Spacer />
						<Box borderStyle="round" borderColor="yellow" flexDirection="row">
							<Text color="yellow" bold>
								{' '}
								/{' '}
							</Text>
							<Text bold>
								<TextInput
									value={search.query}
									onChange={search => {
										setSearch(prev => {
											return {
												...prev,
												query: search,
											};
										});
									}}
								/>
							</Text>
						</Box>
					</Box>
				)}
			</Box>
		</Box>
	);
}
