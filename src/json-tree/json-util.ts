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

export function getHighlightableNodes(node: JsonNode, path = ""): NavigableNode[] {
	if (isPrimitive(node)) {
		return [{ node, path }];
	}

	const result: NavigableNode[] = [];

	if (isObjectNode(node)) {
		for (const prop of node.properties) {
			const propPath = `${path}/${prop.key.value}`;
			if (!isPrimitive(prop.value)) {
				result.push(...getHighlightableNodes(prop.value, propPath));
			} else {
				result.push({ node: prop.key, path: propPath });
			}
		}
	} else if (isArrayNode(node)) {
		for (let i = 0; i < node.elements.length; i++) {
			const elem = node.elements[i];
			const elemPath = `${path}/${i}`;
			if (isPrimitive(elem)) {
				result.push({ node: elem, path: elemPath });
			} else {
				result.push(...getHighlightableNodes(elem, elemPath));
			}
		}
	}

	return result;
}
