import {nodeResolve} from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
	input: 'dist/cli.js',
	output: {
		dir: 'output',
		format: 'cjs',
	},
	plugins: [nodeResolve(), cjs(), json()],
};
