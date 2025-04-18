#!/usr/bin/env node
import chalk from 'chalk';
import { render } from 'ink';
import meow from 'meow';
import { existsSync } from 'node:fs';
import { clearScreenDown, cursorTo } from 'node:readline';
import App from './app.js';
import { getConfig } from './config.js';
import { getTools } from './tools.js';

const cli = meow(
	`
	Usage
	  $ ink

	Options
		--name  Your name

	Examples
	  $ ink --name=Jane
	  Hello, Jane
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
		},
	},
);

async function main() {
	const [config, error] = await getConfig();

	if (error) {
		console.error(chalk.red(`Could not read config: ${error.message}`));
		process.exit(1);
	}

	if (!existsSync(config.rootDir)) {
		console.error(
			chalk.red(
				`Could not find ${config.rootDir} from where to search recursively`,
			),
		);
		return;
	}

	const [tools, toolsError] = await getTools();

	if (toolsError) {
		console.error(chalk.red(`Could not find tools: ${toolsError.message}`));
		process.exit(1);
	}

	cursorTo(process.stdout, 0, 0);
	clearScreenDown(process.stdout);

	const { waitUntilExit } = render(
		<App name={cli.flags.name} tools={tools} config={config} />,
	);
	waitUntilExit().then(() => console.log('\nGoodbye!'));
}

main();
