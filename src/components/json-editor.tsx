import Fuse from 'fuse.js';
import { Box, Text, useFocusManager, useInput } from 'ink';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { addJsonEditAtom } from '../atoms/json-editor-atoms.js';
import { useComponentHeight } from '../hooks/useComponentHeight.js';
import { Key, Keybinding, useKeybindings } from '../hooks/useKeybindings.js';
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
import { stringify } from '../json-tree/syntax-highlight.js';
import { getJsonPointer, JSONValue } from '../jsonpath.js';
import { logger } from '../logger.js';
import TextInput from './input.js';
import { SyntaxHighlighter } from './syntax-highlighter.js';
import { useNotification } from './notification.js';
import { MathUtils } from '../math.js';

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

export function JsonEditor({ id, filePath, onExit }: JsonEditorProps) {
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

	const [scrollOffset, setScrollOffset] = useState(0);

	const [debug, setDebug] = useState(false);
	const { showNotification } = useNotification();

	useEffect(() => {
		const loadFile = async () => {
			if (!filePath) {
				setJsonTree(null);
				setError(null);
				return;
			}

			const [parsed, err] = await parseJsonFile(filePath);

			if (err) {
				logger.error({ error: err }, 'Error parsing JSON file');
				setError(err);
				setJsonTree(null);
				return;
			}

			const [parsedJson] = parsed;

			// Format the JSON without syntax highlighting
			const formattedContent = stringify(parsedJson);

			// Reparse since stringify changed the formatting and we need the correct locations
			const [json, err2] = parseJson(formattedContent);

			if (err2) {
				logger.error(
					{ error: err2, content: formattedContent },
					'Error parsing stringified JSON',
				);
				setError(err2);
				setJsonTree(null);
				return;
			}

			logger.info('Set highlighted content due to file path change');

			setJsonTree(json as JsonValueNode);
			const navigable = getNavigableNodes(json);
			setNavigableNodes(navigable);
			setCursor({ path: navigable[0]?.path || '/', index: 0, node: navigable[0]?.node });
			setScrollOffset(navigable[0]?.node?.loc?.start.line || 0);
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
			keys: ['node'],
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
				key: [Key.create('j'), Key.create('n', ['ctrl'])],
				label: 'Move cursor down',
				action: () => moveCursor(1),
				showInHelp: false,
			},
			{
				key: [Key.create('k'), Key.create('p', ['ctrl'])],
				label: 'Move cursor up',
				action: () => moveCursor(-1),
				showInHelp: false,
			},
			{
				key: Key.create('d', ['ctrl']),
				showInHelp: false,
				action: () => moveCursor(5),
				label: 'Jump down',
			},
			{
				key: Key.create('u', ['ctrl']),
				showInHelp: false,
				action: () => moveCursor(-5),
				label: 'Jump up',
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

					if (search.doSearch) {
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
				predicate: () => !search.doSearch,
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
			{
				key: Key.create('h', ['ctrl']),
				label: 'Show debug info',
				showInHelp: false,
				action: () => {
					setDebug(prev => !prev);
				},
			}
		],
		[cursor, navigableNodes, search],
	);

	function moveCursor(lines: number) {
		setCursor(prev => {
			const next = MathUtils.mod((prev.index ?? 0) + lines, navigableNodes.length);
			const nextNode = navigableNodes[next];
			return { index: next, node: nextNode.node, path: nextNode.path };
		});
	}

	useKeybindings(keybindings, id);

	useEffect(() => {
		if (!debug) {
			return;
		}

		logger.info('Showing debug info');

		const debugInfo = {
			cursor,
		};
		showNotification({
			title: 'Debug info',
			message: JSON.stringify(debugInfo, null, 2),
			transparent: true,
			size: '3/4'
		});
	}, [debug, cursor]);

	useEffect(() => {
		if (!search.query || !search.doSearch) {
			return;
		}

		try {
			const searched = fuse.search(search.query);
			const winner = searched[0]?.item;
			logger.info({ query: search.query, winner, searched }, 'Search result');
			setCursor(prev => {
				return {
					...prev,
					index: navigableNodes.indexOf(winner),
					node: winner?.node,
				};
			});
		} catch (error) {
			return;
		}
	}, [search]);

	const { ref, height } = useComponentHeight(0, 5);

	useEffect(() => {
		if (!cursor.node || !height) return;


		const cursorLine = cursor.node?.loc?.start.line || 0;

		if (cursorLine < scrollOffset) {
			setScrollOffset(cursorLine);
			logger.info({ height, cursorLine, scrollOffset: cursorLine }, 'Calculated scroll offset');
		} else if (cursorLine >= scrollOffset + height) {
			setScrollOffset(cursorLine - height + 1);
			logger.info({ height, cursorLine, scrollOffset: cursorLine - height + 1 }, 'Calculated scroll offset');
		}
	}, [cursor, height]);

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
		<Box
			height="100%"
			width="100%"
			flexDirection="column"
			borderStyle="round"
			padding={0}
			overflow="hidden"
		>
			{cursor.path && <Text color="gray">Current path: {cursor.path}</Text>}
			<Box
				height="100%"
				ref={ref}
				flexDirection="column"
				justifyContent="space-between"
			>
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
						renderRange={[scrollOffset, scrollOffset + height]}
						onStringInputSubmit={(prevValue: string, newValue: string) => {
							if (!focusedNode || !cursor.index) {
								return;
							}

							if (isStringNode(focusedNode)) {
								const path = navigableNodes[cursor.index].path;

								addStringChange({
									path: path,
									value: newValue,
									originalValue: prevValue,
									filePath: filePath,
								});

								logger.info(
									{ path, value: newValue, filePath },
									'Saved string change',
								);
							}

							setFocusedNode(null);
						}}
					/>
				</Text>
				{search.doSearch && (
					<Box
						borderStyle="single"
						borderColor="yellow"
						borderLeft={false}
						borderRight={false}
						borderBottom={false}
						flexDirection="row"
					>
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
				)}
			</Box>
		</Box>
	);
}
