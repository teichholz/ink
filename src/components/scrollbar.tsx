import chalk, { ColorName } from 'chalk';
import figures from 'figures';
import { Box, Text } from 'ink';

// chalk type is a little restrictive, so we loosen it up here and ensure that the passed in properties are valid
declare module 'chalk' {
	interface ChalkInstance {
		[color: string]: this;
	}
}

type ScrollbarProps = {
	/**
	 * Total number of items or total height
	 */
	totalItems: number;

	/**
	 * Number of items that can be displayed at once or visible height
	 */
	visibleItems: number;

	/**
	 * Current scroll position (index of the first visible item or scroll offset)
	 */
	scrollOffset: number;

	/**
	 * Width of the scrollbar
	 */
	width?: number;

	/**
	 * Character to use for the scrollbar thumb
	 */
	thumbChar?: keyof typeof figures;

	/**
	 * Character to use for the scrollbar track
	 */
	trackChar?: keyof typeof figures;

	/**
	 * Color of the scrollbar thumb
	 */
	thumbColor?: ColorName;

	/**
	 * Color of the scrollbar track
	 */
	trackColor?: ColorName;

	/**
	 * Whether to use percentage-based scrolling (for variable height items)
	 */
	usePercentage?: boolean;
};

export default function Scrollbar({
	totalItems,
	visibleItems,
	scrollOffset,
	width = 1,
	thumbChar = 'lineVerticalBold',
	trackChar = 'lineVertical',
	thumbColor = 'blue',
	trackColor = 'gray',
	usePercentage = false,
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

	let scrollRatio;

	if (usePercentage) {
		// For variable height items, scrollOffset is already a percentage or absolute position
		scrollRatio = Math.min(1, Math.max(0, scrollOffset / (totalItems - visibleItems)));
	} else {
		// For fixed height items, calculate ratio based on item indices
		const maxScrollOffset = Math.max(0, totalItems - visibleItems);
		scrollRatio = maxScrollOffset > 0 ? scrollOffset / maxScrollOffset : 0;
	}

	const scrollbarStart = Math.floor(
		scrollRatio * (visibleItems - scrollbarHeight),
	);

	return (
		<Box flexDirection="column" width={width} marginLeft={1}>
			{Array.from({ length: visibleItems }).map((_, index) => {
				const isScrollbarElement =
					index >= scrollbarStart && index < scrollbarStart + scrollbarHeight;

				return (
					<Text key={index}>
						{isScrollbarElement
							? chalk[thumbColor](figures[thumbChar])
							: chalk[trackColor](figures[trackChar])}
					</Text>
				);
			})}
		</Box>
	);
}
