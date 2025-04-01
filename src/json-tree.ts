import type { Node, VariableDeclaration, Program, Expression, Literal, Property } from "acorn";
import { parse } from "acorn";

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
  type: "Literal";
  value: string;
  raw: string;
}

/**
 * JSON number value node
 */
export interface JsonNumberNode extends JsonNode {
  type: "Literal";
  value: number;
  raw: string;
}

/**
 * JSON boolean value node
 */
export interface JsonBooleanNode extends JsonNode {
  type: "Literal";
  value: boolean;
  raw: string;
}

/**
 * JSON null value node
 */
export interface JsonNullNode extends JsonNode {
  type: "Literal";
  value: null;
  raw: string;
}

/**
 * JSON property node (key-value pair)
 */
export interface JsonPropertyNode extends JsonNode {
  type: "Property";
  key: JsonStringNode;
  value: JsonValueNode;
  kind: "init";
  method: boolean;
  shorthand: boolean;
  computed: boolean;
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
  const program = ast as Program;
  const variableDeclaration = program.body[0] as VariableDeclaration;
  const variableDeclarator = variableDeclaration.declarations[0];
  const objectExpression = variableDeclarator.init as Expression;

  return objectExpression as unknown as JsonObjectNode;
}

/**
 * Transforms an Acorn AST node into our simplified JSON AST format
 * This could be used if we need to transform the AST further
 */
export function transformAcornAst(node: Node): JsonNode {
  if (node.type === "ObjectExpression") {
    return {
      type: "ObjectExpression",
      properties: node.properties.map(prop => transformAcornAst(prop as Node) as JsonPropertyNode),
      loc: node.loc!
    } as JsonObjectNode;
  } else if (node.type === "ArrayExpression") {
    return {
      type: "ArrayExpression",
      elements: node.elements.map(elem => elem ? transformAcornAst(elem as Node) as JsonValueNode : null).filter(Boolean),
      loc: node.loc!
    } as JsonArrayNode;
  } else if (node.type === "Property") {
    const prop = node as unknown as Property;
    return {
      type: "Property",
      key: transformAcornAst(prop.key as Node) as JsonStringNode,
      value: transformAcornAst(prop.value as Node) as JsonValueNode,
      kind: prop.kind,
      method: prop.method,
      shorthand: prop.shorthand,
      computed: prop.computed,
      loc: node.loc!
    } as JsonPropertyNode;
  } else if (node.type === "Literal") {
    const literal = node as unknown as Literal;
    if (typeof literal.value === "string") {
      return {
        type: "Literal",
        value: literal.value,
        raw: literal.raw || `"${literal.value}"`,
        loc: node.loc!
      } as JsonStringNode;
    } else if (typeof literal.value === "number") {
      return {
        type: "Literal",
        value: literal.value,
        raw: literal.raw || String(literal.value),
        loc: node.loc!
      } as JsonNumberNode;
    } else if (typeof literal.value === "boolean") {
      return {
        type: "Literal",
        value: literal.value,
        raw: literal.raw || String(literal.value),
        loc: node.loc!
      } as JsonBooleanNode;
    } else if (literal.value === null) {
      return {
        type: "Literal",
        value: null,
        raw: "null",
        loc: node.loc!
      } as JsonNullNode;
    }
  }
  
  throw new Error(`Unsupported node type: ${node.type}`);
}
