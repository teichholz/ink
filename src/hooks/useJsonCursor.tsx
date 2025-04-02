import {useCallback, useState} from 'react';
import {
	JsonNode,
	JsonValueNode,
	isArrayNode,
	isObjectNode,
} from '../json-tree/json-tree.js';

type CursorPosition = {
	path: (string | number)[];
	node: JsonNode;
};

/**
 * Finds all navigable nodes in a JSON tree
 */
function findNavigableNodes(
	node: JsonNode,
	path: (string | number)[] = [],
	result: CursorPosition[] = [],
): CursorPosition[] {
	// Add current node to result
	result.push({path: [...path], node});

	if (isObjectNode(node)) {
		// For objects, add all properties
		node.properties.forEach((prop, index) => {
			// Add the property node (for the key)
			findNavigableNodes(prop, [...path, index], result);

			// Add the property's value node if it's an object or array
			const value = prop.value;
			if (isObjectNode(value) || isArrayNode(value)) {
				findNavigableNodes(value, [...path, index, 'value'], result);
			}
		});
	} else if (isArrayNode(node)) {
		// For arrays, add all elements
		node.elements.forEach((elem, index) => {
			findNavigableNodes(elem, [...path, index], result);
		});
	}

	return result;
}

/**
 * Hook for navigating through a JSON tree with cursor
 */
export function useJsonCursor(rootNode: JsonValueNode | null) {
	const [cursorIndex, setCursorIndex] = useState<number>(0);
	const [navigableNodes, setNavigableNodes] = useState<CursorPosition[]>([]);

	// Recalculate navigable nodes when the root node changes
	const updateNavigableNodes = useCallback(() => {
		if (!rootNode) {
			setNavigableNodes([]);
			setCursorIndex(0);
			return;
		}

		const nodes = findNavigableNodes(rootNode);
		setNavigableNodes(nodes);
		setCursorIndex(nodes.length > 0 ? 0 : -1);
	}, [rootNode]);

	// Move cursor up
	const moveCursorUp = useCallback(() => {
		if (navigableNodes.length === 0) return;
		setCursorIndex(prev => (prev > 0 ? prev - 1 : navigableNodes.length - 1));
	}, [navigableNodes]);

	// Move cursor down
	const moveCursorDown = useCallback(() => {
		if (navigableNodes.length === 0) return;
		setCursorIndex(prev => (prev < navigableNodes.length - 1 ? prev + 1 : 0));
	}, [navigableNodes]);

	// Get current cursor position
	const getCurrentCursor = useCallback(() => {
		if (cursorIndex >= 0 && cursorIndex < navigableNodes.length) {
			return navigableNodes[cursorIndex];
		}
		return null;
	}, [cursorIndex, navigableNodes]);

	// Check if a node is the current cursor position
	const isNodeAtCursor = useCallback(
		(node: JsonNode): boolean => {
			const current = getCurrentCursor();
			return current !== null && current.node === node;
		},
		[getCurrentCursor],
	);

	return {
		updateNavigableNodes,
		moveCursorUp,
		moveCursorDown,
		getCurrentCursor,
		isNodeAtCursor,
	};
}
