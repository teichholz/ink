import {useEffect, useRef, useState} from 'react';
import {DOMElement, measureElement} from 'ink';

/**
 * A hook that measures the height of a component
 * @param offsetHeight Optional value to subtract from the measured height (for padding, borders, etc.)
 * @returns [ref, height] - The ref to attach to your component and the measured height
 */
export function useComponentHeight(
	offsetHeight = 0,
): [React.RefObject<DOMElement>, number] {
	const ref = useRef<DOMElement>(null);
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (ref.current) {
			const {height} = measureElement(ref.current);
			setHeight(Math.max(0, height - offsetHeight));
		}
	}, [offsetHeight]);

	return [ref, height];
}
