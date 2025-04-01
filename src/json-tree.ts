import type { VariableDeclaration } from "acorn";
import { type ObjectExpression, parse } from "acorn";

export function parseJson(json: string) {
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

	return objectExpression as ObjectExpression;
}
