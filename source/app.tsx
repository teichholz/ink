import React, { useState } from 'react';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import TextInput from './input.js';

type Props = {
	name: string | undefined;
};

export default function App({ }: Props) {
	const [text, setText] = useState('');

	return (
		<Box flexDirection='column'>
			<Box>
				<Box marginRight={1}>
					<Text>{chalk.green('Eingabe')}:</Text>
				</Box>

				<Text>
					<TextInput value={text} onChange={setText} />
				</Text>
			</Box>
			<Text>{chalk.green('Deine Eingabe')}: {text}</Text>
		</Box>
	);
}
