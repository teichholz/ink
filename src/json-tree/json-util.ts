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

	parent?: JsonNode;
};

export function getNavigableNodes(
	node: JsonNode,
	path = "",
	parent?: JsonNode,
): NavigableNode[] {
	if (isPrimitive(node)) {
		return [{ node, path, parent }];
	}

	const result: NavigableNode[] = [];

	if (isObjectNode(node)) {
		for (const prop of node.properties) {
			const propPath = `${path}/${prop.key.value}`;
			if (!isPrimitive(prop.value)) {
				result.push(...getNavigableNodes(prop.value, propPath, node));
			} else {
				result.push({ node: prop, path: propPath, parent: node });
			}
		}
	} else if (isArrayNode(node)) {
		for (let i = 0; i < node.elements.length; i++) {
			const elem = node.elements[i];
			const elemPath = `${path}/${i}`;
			if (isPrimitive(elem)) {
				result.push({ node: elem, path: elemPath, parent: node });
			} else {
				result.push(...getNavigableNodes(elem, elemPath, node));
			}
		}
	}

	return result;
}
