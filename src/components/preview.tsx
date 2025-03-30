import childProcess from 'node:child_process';
import chalk from 'chalk';
import {Box, DOMElement, measureElement, Text} from 'ink';
import {useEffect, useRef, useState} from 'react';
import type {File} from '../tools.js';
import {LabelInfo} from '../app.js';
import {logger} from '../logger.js';
import {useOutputStreams} from '../hooks/useOutputStreams.js';

type FilePreviewProps = {
	file: File | null;
};

type LabelPreviewProps = {
	label: LabelInfo | null;
};

export function FilePreview({file}: FilePreviewProps) {
	const [fileContent, setFileContent] = useState<string | null>(null);
	const ref = useRef<DOMElement>(null);
	const [availableHeight, setAvailableHeight] = useState(0);
	const {allOutput, errOutput, stdout, stderr} =
		useOutputStreams(availableHeight);

	// Calculate available height for items (accounting for input and borders)
	useEffect(() => {
		if (ref.current) {
			const {height} = measureElement(ref.current);
			setAvailableHeight(height - 5);
		}
	}, []);

	useEffect(() => {
		if (!file) {
			setFileContent(null);
			return;
		}

		try {
			childProcess.spawn('cat', [file.path], {
				stdio: [null, stdout, stderr],
			});
		} catch (err) {
			logger.error(
				{error: err, file: file.path},
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
			<Text>Path: {file.path}</Text>
			<Text>Language: {file.language}</Text>
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
			<Text>Defined in {label.sources.size} file(s)</Text>
		</Box>
	);
}
