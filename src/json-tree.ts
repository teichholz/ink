import type { VariableDeclaration } from "acorn";
import { type ObjectExpression, parse } from "acorn";

/**
 * Position information for a node in the JSON AST
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Location information for a node in the JSON AST
 */
export interface Location {
  start: Position;
  end: Position;
}

/**
 * Base interface for all JSON AST nodes
 */
export interface JsonNode {
  type: string;
  loc: Location;
}

/**
 * JSON string value node
 */
export interface JsonStringNode extends JsonNode {
  type: "StringLiteral";
  value: string;
}

/**
 * JSON number value node
 */
export interface JsonNumberNode extends JsonNode {
  type: "NumericLiteral";
  value: number;
}

/**
 * JSON boolean value node
 */
export interface JsonBooleanNode extends JsonNode {
  type: "BooleanLiteral";
  value: boolean;
}

/**
 * JSON null value node
 */
export interface JsonNullNode extends JsonNode {
  type: "NullLiteral";
  value: null;
}

/**
 * JSON property node (key-value pair)
 */
export interface JsonPropertyNode extends JsonNode {
  type: "Property";
  key: JsonStringNode;
  value: JsonValueNode;
}

/**
 * JSON object node
 */
export interface JsonObjectNode extends JsonNode {
  type: "ObjectExpression";
  properties: JsonPropertyNode[];
}

/**
 * JSON array node
 */
export interface JsonArrayNode extends JsonNode {
  type: "ArrayExpression";
  elements: JsonValueNode[];
}

/**
 * Union type for all possible JSON value nodes
 */
export type JsonValueNode =
  | JsonStringNode
  | JsonNumberNode
  | JsonBooleanNode
  | JsonNullNode
  | JsonObjectNode
  | JsonArrayNode;

/**
 * Parses a JSON string into an AST with location information
 */
export function parseJson(json: string): JsonObjectNode {
  // Wrap the JSON in a variable declaration to make it valid JavaScript
  const wrappedJson = `const jsonData = ${json};`;

  // Parse the wrapped JSON as JavaScript
  const ast = parse(wrappedJson, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  });

  // Extract the object literal node from the variable declaration
  // The AST structure is: Program > VariableDeclaration > VariableDeclarator > ObjectExpression
  const program = ast;
  const variableDeclaration = program.body[0] as VariableDeclaration;
  const variableDeclarator = variableDeclaration.declarations[0];
  const objectExpression = variableDeclarator.init;

  return objectExpression as unknown as JsonObjectNode;
}
