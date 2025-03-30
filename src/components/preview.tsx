import chalk from 'chalk';
import {Box, Text} from 'ink';
import type {File} from '../tools.js';
import {LabelInfo} from '../app.js';

type FilePreviewProps = {
	file: File | null;
};

type LabelPreviewProps = {
	label: LabelInfo | null;
};

export function FilePreview({file}: FilePreviewProps) {
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
