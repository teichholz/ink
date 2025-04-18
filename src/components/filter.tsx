import chalk from 'chalk';
import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { Box, DOMElement, measureElement, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Simplify } from 'type-fest';
import { Key, Keybinding, useKeybindings } from '../hooks/useKeybindings.js';
import TextInput from './input.js';
import { logger } from '../logger.js';
import Scrollable from './scrollable.js';

export type FilterItem = {
	id: string;
	name: string;
};

type Props<T extends FilterItem> = {
	/**
	 * ID for the filter component
	 */
	id: string;

	/**
	 * Array of items to filter
	 */
	items: T[];

	/**
	 * Placeholder text for the input
	 */
	placeholder?: string;

	/**
	 * Function to transform the item name
	 */
	transform?: (item: T) => string;

	/**
	 * Function to transform the item prefix
	 */
	prefix?: string | ((item: T) => string);

	/**
	 * Function to transform the item suffix
	 */
	suffix?: string | ((item: T) => string);

	/**
	 * Box props for the outer container
	 */
	outerBox?: Simplify<typeof Box>['defaultProps'];

	/**
	 * Options for the fuse.js library
	 */
	filterOptions?: IFuseOptions<T>;

	/**
	 * Callback function to notify parent component about filter changes
	 */
	onFilterChange?: (filteredItems: T[], isActive: boolean) => void;

	/**
	 * Callback function when an item is selected
	 */
	onSelectionChange?: (item: T) => void;

	/**
	 * Callback function when an item is selected (via keyboard)
	 */
	onSelect?: (item: T) => void;
};

export default function Filter<T extends FilterItem>({
	id,
	items,
	placeholder,
	outerBox,
	filterOptions,
	prefix,
	suffix,
	transform,
	onFilterChange,
	onSelectionChange,
	onSelect,
}: Props<T>) {
	const ref = useRef<DOMElement>(null);
	const [text, setText] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Initialize Fuse instance with default options focused on name property
	const fuse = useMemo(() => {
		return new Fuse(items, {
			keys: ['name'],
			threshold: 0.4,
			...filterOptions,
		});
	}, [items, filterOptions]);

	// Filter items based on search text
	const filteredItems = useMemo(() => {
		if (!text) {
			return items;
		}

		return fuse.search(text).map(result => result.item);
	}, [fuse, text, items]);

	// Notify parent component about filter changes
	useEffect(() => {
		if (onFilterChange) {
			// Debounce the filter change notification to reduce flickering
			const timeoutId = setTimeout(() => {
				logger.info({ filteredItems }, 'Filter changed');
				onFilterChange(filteredItems, text.length > 0);
			}, 100);

			return () => clearTimeout(timeoutId);
		}

		return () => { };
	}, [filteredItems]);

	// Reset selected index when filtered items change
	React.useEffect(() => {
		setSelectedIndex(0);
	}, [filteredItems]);

	// Define keybindings using our custom hook
	const keybindings: Keybinding[] = useMemo<Keybinding[]>(
		() => [
			{
				key: Key.create('n', ['ctrl']),
				label: 'Move selection down',
				action: () => {
					setSelectedIndex(prev => {
						const newIndex = Math.min(prev + 1, filteredItems.length - 1);
						return newIndex;
					});
				},
				showInHelp: true,
			},
			{
				key: Key.create('p', ['ctrl']),
				label: 'Move selection up',
				action: () => {
					setSelectedIndex(prev => {
						const newIndex = Math.max(prev - 1, 0);
						return newIndex;
					});
				},
				showInHelp: true,
			},
			{
				key: Key.modifier('return'),
				label: 'Edit file',
				action: () => {
					logger.info('Entering edit mode');
					onSelect?.(filteredItems[selectedIndex]);
				},
				showInHelp: true,
			},
		],
		[filteredItems, selectedIndex],
	);

	const { isFocused } = useKeybindings(keybindings, id);

	// notify app that an item has changed
	useEffect(() => {
		const selected = filteredItems[selectedIndex];
		if (selected && isFocused) {
			onSelectionChange?.(selected);
		}
	}, [selectedIndex, filteredItems, isFocused]);


	return (
		<Box
			{...outerBox}
			ref={ref}
			height="100%"
			width="100%"
			borderStyle="round"
			flexDirection="column"
		>
			<Box
				padding={0.2}
				borderStyle="round"
				borderTop={false}
				borderLeft={false}
				borderRight={false}
			>
				<Box marginRight={0.2}>
					<Text>{chalk.green('Input')}: </Text>
				</Box>
				<Text>
					<TextInput
						placeholder={placeholder || 'Filter'}
						focus={isFocused}
						value={text}
						onChange={setText}
					/>
				</Text>
				<Box flexGrow={1} flexDirection="row-reverse" alignItems="flex-end">
					<Text>
						{chalk.yellow(`(${filteredItems.length} / ${items.length})`)}
					</Text>
				</Box>
			</Box>

			<Scrollable
				id="filter-scrollable"
				items={filteredItems}
				selectedIndex={selectedIndex}
				onSelectionChange={onSelectionChange}
				itemComponentOverride={{ prefix, suffix, transform }}
			/>
		</Box>
	);
}
