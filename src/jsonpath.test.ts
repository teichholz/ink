import { describe, expect, it } from "vitest";
import { modifyJsonPointer } from "./jsonpath.js";
import { Res } from "./types.js";

describe("modifyJsonPath", () => {
	// Test simple string replacement
	it("should replace a string value at root level", () => {
		const json = "hello world";
		const result = modifyJsonPointer(json, "goodbye world", "");

		expect(Res.unwrap(result)).toBe("goodbye world");
	});

	// Test object property modification
	it("should modify a property in an object", () => {
		const json = { name: "John", age: 30 };
		const result = modifyJsonPointer(json, "Jane", "/name");

		expect(Res.unwrap(result)).toEqual({ name: "Jane", age: 30 });
	});

	// Test nested object property modification
	it("should modify a nested property in an object", () => {
		const json = {
			person: {
				name: "John",
				address: {
					city: "New York",
				},
			},
		};
		const result = modifyJsonPointer(json, "Boston", "/person/address/city");

		expect(Res.isOk(result)).toBe(true);
		const unwrapped = Res.unwrap(result) as any;
		expect(unwrapped.person.address.city).toBe("Boston");
	});

	// Test array element modification
	it("should modify an element in an array", () => {
		const json = ["apple", "banana", "cherry"];
		const result = modifyJsonPointer(json, "orange", "/1");

		expect(Res.isOk(result)).toBe(true);
		expect(Res.unwrap(result)).toEqual(["apple", "orange", "cherry"]);
	});
});
