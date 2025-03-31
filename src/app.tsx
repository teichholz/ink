import chalk from 'chalk';
import {Box, Text, useFocusManager} from 'ink';
import {useAtom} from 'jotai';
import {useEffect, useMemo, useState} from 'react';
import Filter, {FilterItem} from './components/filter.js';
import {useNotification} from './components/notification.js';
import {FilePreview, LabelPreview} from './components/preview.js';
import {Config} from './config.js';
import {currentFocusedKeybindings} from './hooks/useKeybindings.js';
import {useStdoutDimensions} from './hooks/useStdoutDimensions.js';
import {logger} from './logger.js';
import {extractLabelsFromFile, find, Tools} from './tools.js';

type Props = {
	name: string | undefined;
	tools: Tools;
	config: Config;
};

type FilePath = string;

export type FileInfo = {
	/**
	 * The file name without the language capture
	 */
	rootFileName: string;

	/**
	 * The full path to the files
	 */
	paths: Set<FilePath>;

	/**
	 * The languages of the file
	 */
	languages: Set<string>;
};

// Type for storing label information
export type LabelInfo = {
	/**
	 *  The label value (e.g. 'hello')
	 */
	key: string;

	/**
	 * The languages for which this label is defined
	 * e.g. Set('en', 'de')
	 */
	languages: Set<string>;

	/**
	 * The concrete files and their value for the label
	 */
	sources: Map<FilePath, unknown>; // Maps file path to the label value
};

interface Item<T> extends FilterItem {
	item: T;
}

// Wrap the app with the ActiveKeybindingsProvider
export default function App(props: Props) {
	return <AppContent {...props} />;
}

function AppContent({tools, config}: Props) {
	const [allFiles, setAllFiles] = useState<Array<Item<FileInfo>>>([]);
	const [allLabels, setAllLabels] = useState<Array<Item<LabelInfo>>>([]);

	// Track filtered items
	const [filteredLabelIds, setFilteredLabelIds] = useState<Set<string>>(
		new Set(),
	);
	const [filteredFileIds, setFilteredFileIds] = useState<Set<string>>(
		new Set(),
	);

	// Track whether filters are active
	const [isLabelFilterActive, setIsLabelFilterActive] = useState(false);
	const [isFileFilterActive, setIsFileFilterActive] = useState(false);

	// Track selected items for preview
	const [selectedLabel, setSelectedLabel] = useState<LabelInfo | null>(null);
	const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

	const [activeKeybindings] = useAtom(currentFocusedKeybindings);

	const [cols, rows] = useStdoutDimensions();
	const {focusNext} = useFocusManager();
	const {showNotification, NotificationComponent} = useNotification();

	useEffect(() => {
		logger.info({config}, 'Starting application');
		const loadFilesAndLabels = async () => {
			const fileItems: Array<Item<FileInfo>> = [];
			const fileInfos = new Map<string, FileInfo>();
			const labelInfoMap = new Map<string, LabelInfo>();

			for await (const file of find(tools.fd, config)) {
				logger.info(`Loading labels for ${file.path}`);

				// Only add file once to the file list to avoid duplicates
				// We still need to extract labels from the file
				const fileInfo: FileInfo = {
					rootFileName: file.rootFileName,
					paths: new Set([file.path]),
					languages: new Set([file.language]),
				};
				if (!fileInfos.has(file.rootFileName)) {
					fileItems.push({
						id: file.rootFileName,
						name: file.rootFileName,
						item: fileInfo,
					});
					fileInfos.set(file.rootFileName, fileInfo);
				} else {
					const existingFileInfo = fileInfos.get(file.rootFileName);
					existingFileInfo?.paths.add(file.path);
					existingFileInfo?.languages.add(file.language);
				}

				// Extract labels from the file
				const [labels, error] = await extractLabelsFromFile(
					file,
					config.jsonPath,
				);

				if (error) {
					logger.error(
						{error, file: file.path},
						'Failed to extract labels from file',
					);
					showNotification({
						title: 'Error',
						message: error.message,
					});

					continue;
				}

				logger.debug(
					{file: file.path, labelCount: labels.size},
					'Extracted labels from file',
				);

				// Process each label
				for (const [key, value] of labels.entries()) {
					// Get or create label info
					let labelInfo = labelInfoMap.get(key);
					if (!labelInfo) {
						labelInfo = {
							key,
							languages: new Set(),
							sources: new Map(),
						};
						labelInfoMap.set(key, labelInfo);
					}

					labelInfo.languages.add(file.language);
					labelInfo.sources.set(file.rootFileName, value);
				}
			}

			// Convert label map to array for the filter component
			const labelItems = Array.from(labelInfoMap.values()).map(info => ({
				id: info.key,
				name: info.key,
				item: info,
			}));

			logger.info(
				{
					fileCount: fileItems.length,
					labelCount: labelItems.length,
				},
				'Files and labels loaded',
			);

			setAllFiles(fileItems);
			setAllLabels(labelItems);
		};

		loadFilesAndLabels();
	}, [tools, config]);

	useEffect(() => {
		// Set initial focus
		focusNext();
	}, [focusNext]);

	// Filter labels based on selected files - with memoization to prevent recalculation
	const visibleLabels = useMemo(() => {
		logger.info({filteredFileIds}, 'Filtering labels');

		if (!isFileFilterActive || filteredFileIds.size === 0) {
			return allLabels;
		}

		return allLabels.filter(label => {
			// Check if any of the label's sources are in the filtered files
			for (const file of label.item.sources.keys()) {
				logger.info({file: file, label: label}, 'Checking file');
				if (filteredFileIds.has(file)) {
					return true;
				}
			}
			return false;
		});
	}, [allLabels, filteredFileIds, isFileFilterActive]);

	// Filter files based on selected labels - with memoization to prevent recalculation
	const visibleFiles = useMemo(() => {
		if (!isLabelFilterActive || filteredLabelIds.size === 0) {
			return allFiles;
		}

		return allFiles.filter(file => {
			// Check if this file contains any of the filtered labels
			return allLabels.some(
				label =>
					filteredLabelIds.has(label.id) &&
					label.item.sources.has(file.item.rootFileName),
			);
		});
	}, [allFiles, allLabels, filteredLabelIds, isLabelFilterActive]);

	// Handle label filter changes
	const handleLabelFilterChange = (
		filteredItems: Array<{id: string}>,
		isActive: boolean,
	) => {
		const newFilteredIds = new Set(filteredItems.flatMap(item => item.id));
		setFilteredLabelIds(newFilteredIds);
		setIsLabelFilterActive(isActive);
	};

	// Handle file filter changes
	const handleFileFilterChange = (
		filteredItems: Array<Item<FileInfo>>,
		isActive: boolean,
	) => {
		logger.info({filteredItems}, 'File filter changed');
		const newFilteredIds = new Set(
			filteredItems.flatMap(item => [...item.item.paths]),
		);
		setFilteredFileIds(newFilteredIds);
		setIsFileFilterActive(isActive);
	};

	return (
		<Box height={rows} width={cols} flexDirection="column">
			<Box height={rows - 1} width="100%" flexDirection="row">
				<Box width="25%" flexDirection="column">
					<Filter
						id="filter1"
						items={visibleLabels}
						placeholder="Filter by label"
						suffix={item =>
							` (${chalk.yellow(Array.from(item.item.languages).join(', '))})`
						}
						onFilterChange={handleLabelFilterChange}
						onSelect={item => {
							setSelectedLabel(item.item);
							setSelectedFile(null);
						}}
					/>
					<Filter
						id="filter2"
						items={visibleFiles}
						placeholder="Filter by file"
						onFilterChange={handleFileFilterChange}
						onSelect={item => {
							setSelectedFile(item.item);
							setSelectedLabel(null);
						}}
					/>
				</Box>
				<Box width="75%" borderStyle="round" flexDirection="column">
					{selectedLabel ? (
						<LabelPreview label={selectedLabel} />
					) : (
						<FilePreview file={selectedFile} />
					)}
				</Box>
			</Box>

			<Box height={1} width="100%" flexDirection="column" padding={1}>
				<Text>{activeKeybindings?.pretty()}</Text>
			</Box>
			{NotificationComponent}
		</Box>
	);
}
