import {Box, Text, useInput} from 'ink';
import {useAtomValue} from 'jotai';
import {useState} from 'react';
import {jsonEditAtom} from '../atoms/json-editor-atoms.js';
import {calculateDiff} from '../json-modifier.js';
import {useEffect} from 'react';
import {type Change} from 'diff';
import {basename} from 'path';
import Scrollbar from './scrollbar.js';

type DiffDisplayProps = {
	diff: Change[];
};

function DiffDisplay({diff}: DiffDisplayProps) {
	return (
		<Box flexDirection="column">
			{diff.map((part, index) => (
				<Text
					key={index}
					color={part.added ? 'green' : part.removed ? 'red' : 'gray'}
				>
					{part.value}
				</Text>
			))}
		</Box>
	);
}

type DeltaItemProps = {
	path: string;
	filePath: string;
	originalValue: string;
	value: string;
	timestamp: number;
	diff: Change[];
};

function DeltaItem({path, filePath, timestamp, diff}: DeltaItemProps) {
	const date = new Date(timestamp);
	const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

	return (
		<Box flexDirection="column">
			<Text bold>
				Path: <Text color="blue">{path}</Text>
			</Text>
			<Text>
				File: <Text color="yellow">{basename(filePath)}</Text>
			</Text>
			<Text>Time: {formattedDate}</Text>
			<Box>
				<DiffDisplay diff={diff} />
			</Box>
		</Box>
	);
}

export default function DeltaLog() {
	const edits = useAtomValue(jsonEditAtom);
	const [diffs, setDiffs] = useState<Map<number, Change[]>>(new Map());
	const [scrollIndex, setScrollIndex] = useState(0);

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

	// Handle keyboard navigation
	useInput((_input, key) => {
		if (key.upArrow) {
			if (scrollIndex > 0) {
				setScrollIndex(scrollIndex - 1);
			}
		} else if (key.downArrow) {
			if (scrollIndex < Math.max(0, sortedEdits.length - 10)) {
				setScrollIndex(scrollIndex + 1);
			}
		}
	});

	// Calculate visible items based on available height
	const visibleItems = Math.min(10, sortedEdits.length); // Assuming we can show 10 items at once
	const visibleEdits = sortedEdits.slice(
		scrollIndex,
		scrollIndex + visibleItems,
	);

	return (
		<Box
			overflow="hidden"
			flexDirection="column"
			borderStyle="round"
			width="100%"
		>
			<Box flexDirection="column" flexGrow={1}>
				{edits.length === 0 ? (
					<Box>
						<Text color="gray">No edits yet</Text>
					</Box>
				) : (
					<Box flexDirection="row" flexGrow={1}>
						<Box flexDirection="column" flexGrow={1}>
							{visibleEdits.map(edit => (
								<DeltaItem
									key={edit.timestamp}
									path={edit.path}
									filePath={edit.filePath}
									originalValue={edit.originalValue}
									value={edit.value}
									timestamp={edit.timestamp}
									diff={diffs.get(edit.timestamp) || []}
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
