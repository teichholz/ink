import chalk from 'chalk';
import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';
import {execSync} from 'child_process';
import type {File} from '../tools.js';
import {LabelInfo} from '../app.js';
import {logger} from '../logger.js';

type FilePreviewProps = {
	file: File | null;
};

type LabelPreviewProps = {
	label: LabelInfo | null;
};

export function FilePreview({file}: FilePreviewProps) {
	const [fileContent, setFileContent] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setFileContent(null);
			setError(null);
			return;
		}

		try {
			// Execute cat command to get file content
			const content = execSync(`cat "${file.path}"`, {
				encoding: 'utf-8',
				maxBuffer: 1024 * 1024, // 1MB buffer
			});
			setFileContent(content);
			setError(null);
		} catch (err) {
			logger.error({error: err, file: file.path}, 'Failed to read file content');
			setError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
			setFileContent(null);
		}
	}, [file]);

	if (!file) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>{chalk.yellow('No file selected')}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text>{chalk.green('File Preview:')}</Text>
			<Text>Path: {file.path}</Text>
			<Text>Language: {file.language}</Text>
			<Text>Root file name: {file.rootFileName}</Text>
			
			<Box marginTop={1} flexDirection="column">
				<Text>{chalk.blue('File Content:')}</Text>
				{error ? (
					<Text color="red">{error}</Text>
				) : fileContent ? (
					<Box flexDirection="column" overflowY="scroll" height={15}>
						{fileContent.split('\n').map((line, i) => (
							<Text key={i}>{line}</Text>
						))}
					</Box>
				) : (
					<Text>{chalk.yellow('Loading file content...')}</Text>
				)}
			</Box>
		</Box>
	);
}

export function LabelPreview({label}: LabelPreviewProps) {
	if (!label) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>{chalk.yellow('No label selected')}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text>{chalk.green('Label Preview:')}</Text>
			<Text>Key: {label.key}</Text>
			<Text>Languages: {Array.from(label.languages).join(', ')}</Text>
			<Text>Defined in {label.sources.size} file(s)</Text>
		</Box>
	);
}
