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
	const config = await getConfig();

	if (config.isErr()) {
		const error = config.error;
		console.error(chalk.red(`Could not read config: ${error.message}`));
		process.exit(1);
	}

	const configValue = config.value;

	if (!existsSync(configValue.rootDir)) {
		console.error(
			chalk.red(
				`Could not find ${configValue.rootDir} from where to search recursively`,
			),
		);

		process.exit(1);
	}

	const tools = await getTools();

	if (tools.isErr()) {
		const error = tools.error;
		console.error(chalk.red(`Could not find tools: ${error.message}`));
		process.exit(1);
	}

	cursorTo(process.stdout, 0, 0);
	clearScreenDown(process.stdout);

	const { waitUntilExit } = render(
		<App name={cli.flags.name} tools={tools.value} config={configValue} />,
	);
	waitUntilExit().then(() => console.log('\nGoodbye!'));
}

main();
