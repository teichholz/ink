import chalk from 'chalk';
import {Box, Text} from 'ink';
import React from 'react';

type ScrollbarProps = {
	/**
	 * Total number of items
	 */
	totalItems: number;

	/**
	 * Number of items that can be displayed at once
	 */
	visibleItems: number;

	/**
	 * Current scroll position (index of the first visible item)
	 */
	scrollOffset: number;

	/**
	 * Width of the scrollbar
	 */
	width?: number;

	/**
	 * Character to use for the scrollbar thumb
	 */
	thumbChar?: string;

	/**
	 * Character to use for the scrollbar track
	 */
	trackChar?: string;

	/**
	 * Color of the scrollbar thumb
	 */
	thumbColor?: string;

	/**
	 * Color of the scrollbar track
	 */
	trackColor?: string;
};

export default function Scrollbar({
	totalItems,
	visibleItems,
	scrollOffset,
	width = 1,
	thumbChar = '█',
	trackChar = '│',
	thumbColor = 'blue',
	trackColor = 'gray',
}: ScrollbarProps) {
	// Only show scrollbar if we have more items than can be displayed
	if (totalItems <= visibleItems) {
		return null;
	}

	// Calculate scrollbar thumb size and position
	const scrollbarHeight = Math.max(
		1,
		Math.floor((visibleItems * visibleItems) / totalItems),
	);
	
	const maxScrollOffset = Math.max(0, totalItems - visibleItems);
	const scrollRatio = maxScrollOffset > 0 ? scrollOffset / maxScrollOffset : 0;
	
	const scrollbarStart = Math.floor(
		scrollRatio * (visibleItems - scrollbarHeight),
	);

	return (
		<Box flexDirection="column" width={width} marginLeft={1}>
			{Array.from({length: visibleItems}).map((_, index) => {
				const isScrollbarElement =
					index >= scrollbarStart && index < scrollbarStart + scrollbarHeight;

				return (
					<Text key={index}>
						{isScrollbarElement
							? chalk[thumbColor](thumbChar)
							: chalk[trackColor](trackChar)}
					</Text>
				);
			})}
		</Box>
	);
}
