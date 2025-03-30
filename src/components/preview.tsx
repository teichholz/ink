import chalk from 'chalk';
import {Box, Text} from 'ink';
import childProcess from 'node:child_process';
import {useEffect, useState} from 'react';
import {FileInfo, LabelInfo} from '../app.js';
import {useComponentHeight} from '../hooks/useComponentHeight.js';
import {useOutputStreams} from '../hooks/useOutputStreams.js';
import {logger} from '../logger.js';

type FilePreviewProps = {
	file: FileInfo | null;
};

type LabelPreviewProps = {
	label: LabelInfo | null;
};

export function FilePreview({file}: FilePreviewProps) {
	const [fileContent, setFileContent] = useState<string | null>(null);
	const {ref, height: availableHeight} = useComponentHeight(5);
	const {allOutput, errOutput, stdout, stderr} =
		useOutputStreams(availableHeight);

	useEffect(() => {
		if (!file) {
			setFileContent(null);
			return;
		}

		try {
			childProcess.spawn('cat', [file.paths.values().next().value!], {
				stdio: [null, stdout, stderr],
			});
		} catch (err) {
			logger.error(
				{error: err, file: file.paths.values().next().value!},
				'Failed to read file content',
			);
			setFileContent(null);
		}
	}, [file, fileContent]);

	if (!file) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>{chalk.yellow('No file selected')}</Text>
			</Box>
		);
	}

	return (
		<Box ref={ref} flexDirection="column" padding={1}>
			<Text>{chalk.green('File Preview:')}</Text>
			<Text>Paths: {[...file.paths].join(', ')}</Text>
			<Text>Root file name: {file.rootFileName}</Text>

			<Box marginTop={1} overflow="hidden" flexDirection="column">
				<Text>{chalk.blue('File Content:')}</Text>
				{errOutput ? (
					<Text color="red">{errOutput}</Text>
				) : allOutput ? (
					<Text>{allOutput}</Text>
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
			<Text>Defined in: {label.sources.keys().toArray().join(', ')}</Text>
		</Box>
	);
}
