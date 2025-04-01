import { parse } from "acorn";

export function parseJson(json: string) {
	const ast = parse(json, {
		ecmaVersion: "latest",
		sourceType: "module",
		locations: true,
	});

	return ast;
}
