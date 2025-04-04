import {useEffect, useRef, useState} from 'react';
import {DOMElement, measureElement} from 'ink';

/**
 * A hook that measures the height of a component
 * @param offsetHeight Optional value to subtract from the measured height (for padding, borders, etc.)
 * @returns An object with the measured height and a ref callback to attach to your component
 */
export function useComponentHeight(offsetHeight = 0) {
	const [height, setHeight] = useState(0);
	const ref = useRef<DOMElement | null>(null);

	// Re-measure when offsetHeight changes
	useEffect(() => {
		if (ref.current) {
			const {height} = measureElement(ref.current);
			setHeight(Math.max(0, height - offsetHeight));
		}
	}, [offsetHeight]);

	return {
		ref,
		height,
	};
}
