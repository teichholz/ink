import { describe, it, expect } from 'vitest';
import { modifyJsonPath } from '../jsonpath.js';
import { Res } from '../types.js';

describe('modifyJsonPath', () => {
  // Test simple string replacement
  it('should replace a string value at root level', () => {
    const json = "hello world";
    const result = modifyJsonPath(json, "goodbye world", "$");
    
    expect(Res.isOk(result)).toBe(true);
    expect(Res.unwrap(result)).toBe("goodbye world");
  });

  // Test object property modification
  it('should modify a property in an object', () => {
    const json = { name: "John", age: 30 };
    const result = modifyJsonPath(json, "Jane", "$.name");
    
    expect(Res.isOk(result)).toBe(true);
    expect(Res.unwrap(result)).toEqual({ name: "Jane", age: 30 });
  });

  // Test nested object property modification
  it('should modify a nested property in an object', () => {
    const json = { 
      person: { 
        name: "John", 
        address: { 
          city: "New York" 
        } 
      } 
    };
    const result = modifyJsonPath(json, "Boston", "$.person.address.city");
    
    expect(Res.isOk(result)).toBe(true);
    const unwrapped = Res.unwrap(result);
    expect(unwrapped.person.address.city).toBe("Boston");
  });

  // Test array element modification
  it('should modify an element in an array', () => {
    const json = ["apple", "banana", "cherry"];
    const result = modifyJsonPath(json, "orange", "$[1]");
    
    expect(Res.isOk(result)).toBe(true);
    expect(Res.unwrap(result)).toEqual(["apple", "orange", "cherry"]);
  });

  // Test array element in nested object
  it('should modify an array element in a nested object', () => {
    const json = { 
      fruits: ["apple", "banana", "cherry"],
      vegetables: ["carrot", "potato"]
    };
    const result = modifyJsonPath(json, "orange", "$.fruits[1]");
    
    expect(Res.isOk(result)).toBe(true);
    const unwrapped = Res.unwrap(result);
    expect(unwrapped.fruits).toEqual(["apple", "orange", "cherry"]);
    expect(unwrapped.vegetables).toEqual(["carrot", "potato"]);
  });

  // Test error cases
  it('should return error for empty path', () => {
    const json = { name: "John" };
    const result = modifyJsonPath(json, "Jane", "");
    
    expect(Res.isErr(result)).toBe(true);
  });

  it('should return error for invalid path on primitive', () => {
    const json = "hello";
    const result = modifyJsonPath(json, "world", "$.nonexistent");
    
    expect(Res.isErr(result)).toBe(true);
  });

  it('should return error for non-existent path', () => {
    const json = { name: "John" };
    const result = modifyJsonPath(json, "Smith", "$.lastname");
    
    expect(Res.isErr(result)).toBe(true);
  });

  // Test type conversion
  it('should handle type conversion from string to number', () => {
    const json = { age: 30 };
    const result = modifyJsonPath(json, "40", "$.age");
    
    expect(Res.isOk(result)).toBe(true);
    expect(Res.unwrap(result)).toEqual({ age: "40" });
  });

  // Test JSON string as update value
  it('should handle JSON string as update value', () => {
    const json = { person: { name: "John" } };
    const update = JSON.stringify({ firstName: "John", lastName: "Doe" });
    const result = modifyJsonPath(json, update, "$.person");
    
    expect(Res.isOk(result)).toBe(true);
    const unwrapped = Res.unwrap(result);
    expect(unwrapped.person).toBe(update);
  });
});
