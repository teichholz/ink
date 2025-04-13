import { Box, Text } from 'ink';
import { useAtom, useAtomValue } from 'jotai';
import { useState, useMemo } from 'react';
import { jsonEditAtom, removeJsonEditAtom } from '../atoms/json-editor-atoms.js';
import { calculateDiff } from '../json-modifier.js';
import { useEffect } from 'react';
import { type Change } from 'diff';
import { basename } from 'path';
import Scrollbar from './scrollbar.js';
import { Key, useKeybindings } from '../hooks/useKeybindings.js';

// Display modes for delta items
export type DeltaDisplayMode = 'compact' | 'detailed' | 'diff-only';

export default function DeltaLog() {
	const edits = useAtomValue(jsonEditAtom);
	const [, removeEdit] = useAtom(removeJsonEditAtom);
	const [diffs, setDiffs] = useState<Map<number, Change[]>>(new Map());
	const [scrollIndex, setScrollIndex] = useState(0);
	const [cursorIndex, setCursorIndex] = useState(0);
	const [displayMode, setDisplayMode] = useState<DeltaDisplayMode>('detailed');

	// Calculate diffs for all edits
	useEffect(() => {
		async function loadDiffs() {
			const newDiffs = new Map<number, Change[]>();

			for (const edit of edits) {
				const diff = await calculateDiff(edit);
				newDiffs.set(edit.timestamp, diff);
			}

			setDiffs(newDiffs);
		}

		loadDiffs();
	}, [edits]);

	// Sort edits by timestamp (newest first)
	const sortedEdits = [...edits].sort((a, b) => b.timestamp - a.timestamp);

	// Clamp cursor index to valid range
	useEffect(() => {
		if (cursorIndex >= sortedEdits.length && sortedEdits.length > 0) {
			setCursorIndex(sortedEdits.length - 1);
		}
	}, [sortedEdits.length, cursorIndex]);

	// Calculate visible items based on available height
	const visibleItems = Math.min(10, sortedEdits.length); // Assuming we can show 10 items at once
	const visibleEdits = sortedEdits.slice(
		scrollIndex,
		scrollIndex + visibleItems,
	);

	// Setup keybindings
	const keybindings = useMemo(() => [
		{
			key: Key.create('j'),
			label: 'Move cursor down',
			action: () => {
				if (cursorIndex < sortedEdits.length - 1) {
					setCursorIndex(cursorIndex + 1);
					// Auto-scroll if cursor moves out of view
					if (cursorIndex >= scrollIndex + visibleItems - 1) {
						setScrollIndex(Math.min(scrollIndex + 1, Math.max(0, sortedEdits.length - visibleItems)));
					}
				}
			},
			showInHelp: true,
		},
		{
			key: Key.create('k'),
			label: 'Move cursor up',
			action: () => {
				if (cursorIndex > 0) {
					setCursorIndex(cursorIndex - 1);
					// Auto-scroll if cursor moves out of view
					if (cursorIndex < scrollIndex) {
						setScrollIndex(Math.max(0, scrollIndex - 1));
					}
				}
			},
			showInHelp: true,
		},
		{
			key: Key.create('d'),
			label: 'Delete selected edit',
			action: () => {
				if (sortedEdits.length > 0) {
					const editToRemove = sortedEdits[cursorIndex];
					removeEdit(editToRemove);
				}
			},
			showInHelp: true,
		},
		{
			key: Key.create('m'),
			label: 'Change display mode',
			action: () => {
				// Cycle through display modes
				setDisplayMode(current => {
					switch (current) {
						case 'compact': return 'detailed';
						case 'detailed': return 'diff-only';
						case 'diff-only': return 'compact';
						default: return 'detailed';
					}
				});
			},
			showInHelp: true,
		}
	], [cursorIndex, scrollIndex, sortedEdits, removeEdit, visibleItems]);

	useKeybindings(keybindings, 'delta-log');

	return (
		<Box
			overflow="hidden"
			flexDirection="column"
			borderStyle="round"
			width="100%"
		>
			<Box flexDirection="column">
				{edits.length === 0 ? (
					<Box>
						<Text color="gray">No edits yet</Text>
					</Box>
				) : (
					<Box flexDirection="row" flexGrow={1}>
						<Box flexDirection="column" flexGrow={1}>
							{visibleEdits.map((edit, index) => (
								<DeltaItem
									key={edit.timestamp}
									path={edit.path}
									filePath={edit.filePath}
									diff={diffs.get(edit.timestamp) || []}
									isSelected={index + scrollIndex === cursorIndex}
									displayMode={displayMode}
								/>
							))}
						</Box>

						<Scrollbar
							totalItems={sortedEdits.length}
							visibleItems={visibleItems}
							scrollOffset={scrollIndex}
						/>
					</Box>
				)}
			</Box>
		</Box>
	);
}

type DeltaItemProps = {
	path: string;
	filePath: string;
	diff: Change[];
	isSelected?: boolean;
	displayMode: DeltaDisplayMode;
};

function DeltaItem({ path, filePath, diff, isSelected = false, displayMode }: DeltaItemProps) {
	return (
		<Box
			flexDirection="column"
			width="100%"
			borderLeft={isSelected}
			borderLeftColor={isSelected ? 'blue' : undefined}
		>
			{(displayMode === 'detailed' || displayMode === 'diff-only') && (
				<Box flexDirection='column'>
					<Text>
						{basename(filePath)}: {path}
					</Text>
					<Box flexDirection="row">
						{diff.map((part, index) => (
							<Text
								key={index}
								color={part.added ? 'green' : part.removed ? 'red' : 'gray'}
							>
								{part.value}
							</Text>
						))}
					</Box>
				</Box>
			)}
			{displayMode === 'compact' && (
				<Box>
					<Text color="gray">
						{diff.reduce((acc, part) => {
							if (part.added) return acc + 1;
							if (part.removed) return acc - 1;
							return acc;
						}, 0)} changes
					</Text>
				</Box>
			)}
		</Box>
	);
}
