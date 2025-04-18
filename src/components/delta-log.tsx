import { Box, Text } from 'ink';
import { useAtom, useAtomValue } from 'jotai';
import { useState, useMemo } from 'react';
import { jsonEditAtom, removeJsonEditAtom } from '../atoms/json-editor-atoms.js';
import { calculateDiff } from '../json-modifier.js';
import { useEffect } from 'react';
import { type Change } from 'diff';
import { basename } from 'path';
import Scrollable from './scrollable.js';
import { type FilterItem } from './filter.js';
import { Key, useKeybindings } from '../hooks/useKeybindings.js';

export type DeltaDisplayMode = 'detailed' | 'file-changes';

type DeltaItemAdapter = FilterItem & {
	path: string;
	filePath: string;
	timestamp: number;
	diff: Change[];
};

export default function DeltaLog() {
	const edits = useAtomValue(jsonEditAtom);
	const [, removeEdit] = useAtom(removeJsonEditAtom);
	const [diffs, setDiffs] = useState<Map<number, Change[]>>(new Map());
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

	// Sort edits by timestamp (newest first) and adapt to Scrollable's expected format
	const adaptedEdits: DeltaItemAdapter[] = useMemo(() => {
		return [...edits]
			.sort((a, b) => b.timestamp - a.timestamp)
			.map(edit => ({
				id: edit.timestamp.toString(),
				name: `${basename(edit.filePath)}: ${edit.path}`,
				path: edit.path,
				filePath: edit.filePath,
				timestamp: edit.timestamp,
				diff: diffs.get(edit.timestamp) || []
			}));
	}, [edits, diffs]);

	// Clamp cursor index to valid range
	useEffect(() => {
		if (cursorIndex >= adaptedEdits.length && adaptedEdits.length > 0) {
			setCursorIndex(adaptedEdits.length - 1);
		}
	}, [adaptedEdits.length, cursorIndex]);

	// Setup keybindings
	const keybindings = useMemo(() => [
		{
			key: [Key.create('j'), Key.create('n', ['ctrl'])],
			label: 'Move cursor down',
			action: () => {
				if (cursorIndex < adaptedEdits.length - 1) {
					setCursorIndex(cursorIndex + 1);
				}
			},
			showInHelp: false,
		},
		{
			key: [Key.create('k'), Key.create('p', ['ctrl'])],
			label: 'Move cursor up',
			action: () => {
				if (cursorIndex > 0) {
					setCursorIndex(cursorIndex - 1);
				}
			},
			showInHelp: false,
		},
		{
			key: Key.create('d'),
			label: 'Delete selected edit',
			action: () => {
				if (adaptedEdits.length > 0) {
					const editToRemove = edits.find(e => e.timestamp === adaptedEdits[cursorIndex].timestamp);
					if (editToRemove) {
						removeEdit(editToRemove);
					}
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
						case 'detailed': return 'file-changes';
						case 'file-changes': return 'detailed';
						default: return 'detailed';
					}
				});
			},
			showInHelp: true,
		}
	], [cursorIndex, adaptedEdits, edits, removeEdit]);

	useKeybindings(keybindings, 'delta-log');

	const DeltaItemComponent = ({ item, selected }: { item: DeltaItemAdapter; selected: boolean }) => (
		<DeltaItem
			path={item.path}
			filePath={item.filePath}
			diff={item.diff}
			isSelected={selected}
			displayMode={displayMode}
		/>
	);

	return (
		<Box
			overflow="hidden"
			flexDirection="column"
			borderStyle="round"
			width="100%"
			height="100%"
		>
			{adaptedEdits.length === 0 ? (
				<Box>
					<Text color="gray">No edits yet</Text>
				</Box>
			) : (
				<Scrollable
					id="delta-log"
					key={displayMode}
					items={adaptedEdits}
					selectedIndex={cursorIndex}
					ItemComponent={DeltaItemComponent}
				/>
			)}
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
			borderRight={false}
			borderTop={false}
			borderBottom={false}
			borderStyle="round"
			borderLeftColor={isSelected ? 'blue' : 'hidden'}
		>
			{(displayMode === 'detailed' || displayMode === 'file-changes') && (
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
		</Box>
	);
}
