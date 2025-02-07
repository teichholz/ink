import chalk from 'chalk';
import type {IFuseOptions} from 'fuse.js';
import Fuse from 'fuse.js';
import {Box, DOMElement, measureElement, Text} from 'ink';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {Simplify} from 'type-fest';
import {useKeybindings, createKeyCombo} from '../hooks/useKeybindings.js';
import TextInput from './input.js';

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
};

export default function Filter<T extends FilterItem>({
	id,
	items,
	placeholder,
	transform = item => item.name,
	prefix = '',
	suffix = '',
	outerBox,
	filterOptions,
	onFilterChange,
}: Props<T>) {
	const ref = useRef<DOMElement>(null);
	const [text, setText] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [availableHeight, setAvailableHeight] = useState(0);

	// Calculate available height for items (accounting for input and borders)
	useEffect(() => {
		if (ref.current) {
			const {height} = measureElement(ref.current);
			setAvailableHeight(height - 5);
		}
	}, []); // Only run once on mount

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
				onFilterChange(filteredItems, text.length > 0);
			}, 250);

			return () => clearTimeout(timeoutId);
		}

		return undefined;
	}, [filteredItems, text, onFilterChange]);

	// Reset selected index when filtered items change
	React.useEffect(() => {
		setSelectedIndex(0);
	}, [filteredItems]);

	// Define keybindings using our custom hook
	const {isFocused} = useKeybindings(
		[
			{
				key: createKeyCombo('n', ['ctrl']),
				label: 'Move selection down',
				action: () => {
					setSelectedIndex(prev => {
						const newIndex = Math.min(prev + 1, filteredItems.length - 1);
						return newIndex;
					});
				},
				requiresFocus: true,
			},
			{
				key: createKeyCombo('p', ['ctrl']),
				label: 'Move selection up',
				action: () => {
					setSelectedIndex(prev => {
						const newIndex = Math.max(prev - 1, 0);
						return newIndex;
					});
				},
				requiresFocus: true,
			},
			{
				key: createKeyCombo('a'),
				label: 'Select item',
				action: () => {
					console.log(`Selected: ${filteredItems[selectedIndex]?.name}`);
				},
				requiresFocus: true,
			},
		],
		id,
	);

	// Adjust scroll offset when selected index changes
	useEffect(() => {
		if (selectedIndex < scrollOffset) {
			// Scroll up if selected item is above visible area
			setScrollOffset(selectedIndex);
		} else if (selectedIndex >= scrollOffset + availableHeight) {
			// Scroll down if selected item is below visible area
			setScrollOffset(selectedIndex - availableHeight + 1);
		}
	}, [selectedIndex, scrollOffset, availableHeight]);

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
			</Box>
			<Box flexDirection="row">
				<Box flexDirection="column" flexGrow={1}>
					{filteredItems.length > 0 ? (
						filteredItems
							.slice(scrollOffset, scrollOffset + availableHeight)
							.map((item, index) => (
								<Text key={item.id}>
									{typeof prefix === 'string' ? prefix : prefix(item)}
									{index + scrollOffset === selectedIndex
										? chalk.underline(transform(item))
										: transform(item)}
									{typeof suffix === 'string' ? suffix : suffix(item)}
								</Text>
							))
					) : (
						<Text>{chalk.yellow('No matching items found')}</Text>
					)}
				</Box>

				{filteredItems.length > availableHeight && (
					<Box flexDirection="column" width={1} marginLeft={1}>
						{Array.from({length: availableHeight}).map((_, index) => {
							// Calculate if this position should show a scrollbar element
							const totalItems = filteredItems.length;
							const scrollbarHeight = Math.max(
								1,
								Math.floor((availableHeight * availableHeight) / totalItems),
							);
							const scrollbarStart = Math.floor(
								(scrollOffset / (totalItems - availableHeight)) *
									(availableHeight - scrollbarHeight),
							);

							const isScrollbarElement =
								index >= scrollbarStart &&
								index < scrollbarStart + scrollbarHeight;

							return (
								<Text key={index}>
									{isScrollbarElement ? chalk.blue('█') : chalk.gray('│')}
								</Text>
							);
						})}
					</Box>
				)}
			</Box>
		</Box>
	);
}
