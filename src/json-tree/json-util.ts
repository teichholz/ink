import {
	type JsonNode,
	type JsonStringNode,
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
				result.push({ node: prop, path: propPath, parent: node });
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

export function test() {}

export function updateJsonNode(
	node: JsonNode,
	path: string,
	value: string,
): JsonNode {
	// Create a deep copy of the node to avoid mutating the original
	const rootCopy = structuredClone(node);
	const parts = path.split("/").filter(Boolean); // Remove empty parts

	if (parts.length === 0) {
		throw new Error("Invalid path: path cannot be empty");
	}

	// Navigate to the parent node that contains the value we want to update
	let currentNode: JsonNode = rootCopy;

	// If the path has only one part, we're updating a top-level property
	if (parts.length === 1) {
		if (!isObjectNode(currentNode)) {
			throw new Error(
				"Root node must be an object when updating a top-level property",
			);
		}

		const propIndex = currentNode.properties.findIndex(
			(p) => p.key.value === parts[0],
		);
		if (propIndex === -1) {
			throw new Error(`Property ${parts[0]} not found at root level`);
		}

		// Update the value of the property
		if (isStringNode(currentNode.properties[propIndex].value)) {
			// Only update the value and raw properties, preserve everything else
			currentNode.properties[propIndex].value.value = value;
			currentNode.properties[propIndex].value.raw = JSON.stringify(value);
		} else {
			// Create a new string node with the same location info
			const oldNode = currentNode.properties[propIndex].value;
			currentNode.properties[propIndex].value = {
				type: "String",
				value: value,
				raw: JSON.stringify(value),
				loc: oldNode.loc,
				range: oldNode.range,
			};
		}

		return rootCopy;
	}

	// For multi-part paths, navigate to the parent node
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];

		if (isObjectNode(currentNode)) {
			const prop = currentNode.properties.find((p) => p.key.value === part);
			if (!prop) {
				throw new Error(
					`Property '${part}' not found at path '/${parts.slice(0, i).join("/")}'`,
				);
			}
			currentNode = prop.value;
		} else if (isArrayNode(currentNode)) {
			const index = Number.parseInt(part, 10);
			if (Number.isNaN(index)) {
				throw new Error(
					`Invalid array index '${part}' at path '/${parts.slice(0, i).join("/")}'`,
				);
			}
			if (index < 0 || index >= currentNode.elements.length) {
				throw new Error(
					`Array index ${index} out of bounds at path '/${parts.slice(0, i).join("/")}'`,
				);
			}
			currentNode = currentNode.elements[index];
		} else {
			throw new Error(
				`Cannot navigate through primitive value at path '/${parts.slice(0, i).join("/")}'`,
			);
		}
	}

	// Get the last part of the path which identifies the property to update
	const lastPart = parts[parts.length - 1];

	// Update the value
	if (isObjectNode(currentNode)) {
		const propIndex = currentNode.properties.findIndex(
			(p) => p.key.value === lastPart,
		);
		if (propIndex === -1) {
			throw new Error(
				`Property '${lastPart}' not found at path '/${parts.slice(0, -1).join("/")}'`,
			);
		}

		if (isStringNode(currentNode.properties[propIndex].value)) {
			// Only update the value and raw properties, preserve everything else
			currentNode.properties[propIndex].value.value = value;
			currentNode.properties[propIndex].value.raw = JSON.stringify(value);
		} else {
			// Create a new string node with the same location info
			const oldNode = currentNode.properties[propIndex].value;
			currentNode.properties[propIndex].value = {
				type: "String",
				value: value,
				raw: JSON.stringify(value),
				loc: oldNode.loc,
				range: oldNode.range,
			};
		}
	} else if (isArrayNode(currentNode)) {
		const index = Number.parseInt(lastPart, 10);
		if (Number.isNaN(index)) {
			throw new Error(
				`Invalid array index '${lastPart}' at path '/${parts.slice(0, -1).join("/")}'`,
			);
		}
		if (index < 0 || index >= currentNode.elements.length) {
			throw new Error(
				`Array index ${index} out of bounds at path '/${parts.slice(0, -1).join("/")}'`,
			);
		}

		if (isStringNode(currentNode.elements[index])) {
			// Only update the value and raw properties, preserve everything else
			currentNode.elements[index].value = value;
			currentNode.elements[index].raw = JSON.stringify(value);
		} else {
			// Create a new string node with the same location info
			const oldNode = currentNode.elements[index];
			currentNode.elements[index] = {
				type: "String",
				value: value,
				raw: JSON.stringify(value),
				loc: oldNode.loc,
				range: oldNode.range,
			};
		}
	} else {
		throw new Error(
			`Cannot update value at path '${path}': parent is not an object or array`,
		);
	}

	return rootCopy;
}
