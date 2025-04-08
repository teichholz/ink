import {
	type JsonNode,
	isArrayNode,
	isBooleanNode,
	isNullNode,
	isNumberNode,
	isObjectNode,
	isStringNode,
} from "./parse-json.js";

export function isPrimitive(node: JsonNode): boolean {
	return (
		isBooleanNode(node) ||
		isNullNode(node) ||
		isNumberNode(node) ||
		isStringNode(node)
	);
}

export type NavigableNode = {
	node: JsonNode;

	/**
	 * json pointer path to the node
	 */
	path: string;
};

export function getHighlightableNodes(node: JsonNode): JsonNode[] {
	if (isPrimitive(node)) {
		return [node];
	}

	const result: JsonNode[] = [];

	if (isObjectNode(node)) {
		for (const prop of node.properties) {
			if (!isPrimitive(prop.value)) {
				result.push(...getHighlightableNodes(prop.value));
			} else {
				result.push(prop.key);
			}
		}
	} else if (isArrayNode(node)) {
		for (const elem of node.elements) {
			if (isPrimitive(elem)) {
				result.push(elem);
			} else {
				result.push(...getHighlightableNodes(elem));
			}
		}
	}

	return result;
}
