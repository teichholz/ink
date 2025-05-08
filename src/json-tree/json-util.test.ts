import { describe, expect, it } from "vitest";
import { updateJsonNode } from "./json-util.js";
import { parseJson } from "./parse-json.js";
import {
	isArrayNode,
	isNumberNode,
	isObjectNode,
	isStringNode,
} from "./parse-json.js";

describe("json-util", () => {
	describe("updateJsonNode", () => {
		it("should update a string value in a simple object", () => {
			// Arrange
			const json = `{
        "name": "John",
        "age": 30
      }`;
			const result = parseJson(json);
			expect(result.isOk()).toBe(true);
			const jsonNode = result._unsafeUnwrap();

			// Act
			const updatedNode = updateJsonNode(jsonNode, "/name", "Jane");

			// Assert
			expect(updatedNode).not.toBe(jsonNode); // Should be a new object (no mutation)

			// Check that the property was updated
			if (!isObjectNode(updatedNode)) {
				throw new Error("Updated node is not an object");
			}

			const nameProperty = updatedNode.properties.find(
				(p) => p.key.value === "name",
			);

			if (!nameProperty) {
				throw new Error("Name property not found");
			}

			if (!isStringNode(nameProperty.value)) {
				throw new Error("Name value is not a string node");
			}

			expect(nameProperty.value.value).toBe("Jane");
			expect(nameProperty.value.raw).toBe('"Jane"');

			// Check that other properties remain unchanged
			const ageProperty = updatedNode.properties.find(
				(p) => p.key.value === "age",
			);

			if (!ageProperty) {
				throw new Error("Age property not found");
			}

			if (!isNumberNode(ageProperty.value)) {
				throw new Error("Age value is not a number node");
			}

			expect(ageProperty.value.value).toBe(30);
		});

		it("should update a string value in a nested object", () => {
			// Arrange
			const json = `{
        "person": {
          "name": "John",
          "contact": {
            "email": "john@example.com"
          }
        }
      }`;
			const result = parseJson(json);
			expect(result.isOk()).toBe(true);
			const jsonNode = result._unsafeUnwrap();

			// Act
			const updatedNode = updateJsonNode(
				jsonNode,
				"/person/contact/email",
				"jane@example.com",
			);

			// Assert
			expect(updatedNode).not.toBe(jsonNode); // Should be a new object (no mutation)

			// Navigate to the updated property
			if (!isObjectNode(updatedNode)) {
				throw new Error("Updated node is not an object");
			}

			const personProperty = updatedNode.properties.find(
				(p) => p.key.value === "person",
			);

			if (!personProperty || !isObjectNode(personProperty.value)) {
				throw new Error("Person property not found or not an object");
			}

			const contactProperty = personProperty.value.properties.find(
				(p) => p.key.value === "contact",
			);

			if (!contactProperty || !isObjectNode(contactProperty.value)) {
				throw new Error("Contact property not found or not an object");
			}

			const emailProperty = contactProperty.value.properties.find(
				(p) => p.key.value === "email",
			);

			if (!emailProperty || !isStringNode(emailProperty.value)) {
				throw new Error("Email property not found or not a string");
			}

			// Check that the property was updated
			expect(emailProperty.value.value).toBe("jane@example.com");
			expect(emailProperty.value.raw).toBe('"jane@example.com"');
		});

		it("should update a value in an array", () => {
			// Arrange
			const json = `{
        "items": ["apple", "banana", "orange"]
      }`;
			const result = parseJson(json);
			expect(result.isOk()).toBe(true);
			const jsonNode = result._unsafeUnwrap();

			// Act
			const updatedNode = updateJsonNode(jsonNode, "/items/1", "grape");

			// Assert
			expect(updatedNode).not.toBe(jsonNode); // Should be a new object (no mutation)

			// Navigate to the updated array
			if (!isObjectNode(updatedNode)) {
				throw new Error("Updated node is not an object");
			}

			const itemsProperty = updatedNode.properties.find(
				(p) => p.key.value === "items",
			);

			if (!itemsProperty || !isArrayNode(itemsProperty.value)) {
				throw new Error("Items property not found or not an array");
			}

			const arrayElements = itemsProperty.value.elements;

			// Check that the array element was updated
			if (!isStringNode(arrayElements[1])) {
				throw new Error("Array element is not a string node");
			}

			expect(arrayElements[1].value).toBe("grape");
			expect(arrayElements[1].raw).toBe('"grape"');

			// Check that other elements remain unchanged
			if (!isStringNode(arrayElements[0]) || !isStringNode(arrayElements[2])) {
				throw new Error("Array elements are not string nodes");
			}

			expect(arrayElements[0].value).toBe("apple");
			expect(arrayElements[2].value).toBe("orange");
		});
	});
});
