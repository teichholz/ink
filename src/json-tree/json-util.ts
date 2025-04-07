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

export function countHighlightableNodes(node: JsonNode): number {
	if (isPrimitive(node)) {
		return 1;
	}

	return innerCountNodes(node);
}

function innerCountNodes(node: JsonNode): number {
	if (isPrimitive(node)) {
		return 0;
	}

	if (isObjectNode(node)) {
		return node.properties.reduce(
			(acc, prop) => acc + 1 + innerCountNodes(prop.value),
			0,
		);
	}

	if (isArrayNode(node)) {
		return node.elements.reduce(
			(acc, elem) => acc + (isPrimitive(elem) ? 1 : innerCountNodes(elem)),
			0,
		);
	}

	return 0;
}
