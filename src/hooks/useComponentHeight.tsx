import {useEffect, useRef, useState} from 'react';
import {DOMElement, measureElement} from 'ink';

/**
 * A hook that measures the height of a component
 * @param offsetHeight Optional value to subtract from the measured height (for padding, borders, etc.)
 * @returns An object with the measured height and a ref callback to attach to your component
 */
export function useComponentHeight(defaultHeight = 0, offsetHeight = 0) {
	const [height, setHeight] = useState(defaultHeight);
	const ref = useRef<DOMElement | null>(null);

	// Re-measure when offsetHeight changes
	useEffect(() => {
		if (ref.current) {
			const {height} = measureElement(ref.current);
			setHeight(Math.max(0, height - offsetHeight));
		}
	}, [offsetHeight, ref.current]);

	return {
		ref,
		height,
	};
}
