import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { FilterItem } from './filter.js';
import Scrollbar from './scrollbar.js';
import { useComponentHeight } from '../hooks/useComponentHeight.js';
import chalk from 'chalk';
import figureSet from 'figures';
import { logger } from '../logger.js';

type ScrollableItemProps<T extends FilterItem> = {
	item: T;
	selected: boolean;
	index: number;
	transform?: (item: T) => string;
	prefix?: string | ((item: T) => string);
	suffix?: string | ((item: T) => string);
}

export function ScrollableItem<T extends FilterItem>({ item, selected, transform, prefix, suffix }: ScrollableItemProps<T>) {

	const displayName = transform ? transform(item) : item.name;
	const prefixedName = prefix ? (typeof prefix === 'function' ? prefix(item) : prefix) : '';
	const suffixedName = suffix ? (typeof suffix === 'function' ? suffix(item) : suffix) : '';

	return (
		<Box justifyContent='space-between' flexDirection='row'>
			<Text>
				{selected ? chalk.blue(figureSet.lineVertical) : ' '}{prefixedName} {displayName}
			</Text>
			<Text>
				{suffixedName}
			</Text>
		</Box>
	);
}

type ScrollableProps<T extends FilterItem> = {
	/**
	 * ID for debugging and tracking
	 */
	id: string;

	/**
	 * Array of items to display in the scrollable list
	 */
	items: T[];

	/**
	 * Currently selected item index
	 */
	selectedIndex: number;

	/**
	 * Component to render each item
	 */
	ItemComponent?: React.FC<ScrollableItemProps<T>>;

	/**
	 * Override the default item component props
	 */
	itemComponentOverride?: Pick<ScrollableItemProps<T>, 'transform' | 'prefix' | 'suffix'>;

	/**
	 * Optional callback when selection changes
	 */
	onSelectionChange?: (item: T) => void;

	/**
	 * Optional height for the component
	 */
	height?: number | string;

	/**
	 * Optional width for the component
	 */
	width?: number | string;
};

export default function Scrollable<T extends FilterItem>({
	id,
	items,
	selectedIndex,
	ItemComponent = ScrollableItem,
	itemComponentOverride = {},
	onSelectionChange,
	height = "100%",
	width = "100%",
}: ScrollableProps<T>) {
	const [scrollOffset, setScrollOffset] = useState(0);
	const { ref, height: availableHeight } = useComponentHeight(10);
	const { ref: itemRef, height: itemHeight } = useComponentHeight(2);

	// Calculate how many items can be displayed based on itemHeight
	const visibleItemCount = itemHeight > 0 ? Math.floor(availableHeight / itemHeight) : availableHeight;

	useEffect(() => {
		logger.info({ itemHeight, availableHeight }, `Scrollable ${id}: Item height and available height`);
	}, [itemRef.current]);

	useEffect(() => {
		if (selectedIndex < scrollOffset) {
			setScrollOffset(selectedIndex);
		} else if (selectedIndex >= scrollOffset + visibleItemCount) {
			setScrollOffset(selectedIndex - visibleItemCount + 1);
		}
	}, [selectedIndex, scrollOffset, visibleItemCount]);

	useEffect(() => {
		const selected = items[selectedIndex];
		if (selected && onSelectionChange) {
			onSelectionChange(selected);
		}
	}, [selectedIndex, items, onSelectionChange]);

	return (
		<Box
			ref={ref}
			height={height}
			width={width}
			flexDirection="row"
		>
			<Box flexDirection="column" flexGrow={1}>
				{items.length > 0 ? (
					items
						.slice(scrollOffset, scrollOffset + visibleItemCount)
						.map((item, index) => (
							<Box ref={itemRef}>
								<ItemComponent
									key={item.id}
									item={item}
									selected={index + scrollOffset === selectedIndex}
									index={index + scrollOffset}
									{...itemComponentOverride}
								/>
							</Box>
						))
				) : (
					<Text>No items to display</Text>
				)}
			</Box>

			<Scrollbar
				totalItems={items.length * itemHeight}
				visibleItems={availableHeight}
				scrollOffset={scrollOffset * itemHeight}
				usePercentage={false}
			/>
		</Box>
	);
}
