import chalk from 'chalk';
import {Box, Text, useFocusManager} from 'ink';
import {createKeyCombo, Keybinding} from './hooks/useKeybindings.js';
import {useAtom} from 'jotai';
import {useEffect, useMemo, useState} from 'react';
import Filter, {FilterItem} from './components/filter.js';
import {JsonEditor} from './components/json-editor.js';
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
	 * Where the labels are defined
	 */
	sources: Set<FilePath>;

	/**
	 * The concrete files and their value for the label
	 */
	values: Map<FilePath, unknown>;
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
	const [filteredLabels, setFilteredLabels] = useState<Set<LabelInfo>>(
		new Set(),
	);
	const [filteredFiles, setFilteredFiles] = useState<Set<FileInfo>>(new Set());

	// Track whether filters are active
	const [isLabelFilterActive, setIsLabelFilterActive] = useState(false);
	const [isFileFilterActive, setIsFileFilterActive] = useState(false);

	// Track selected items for preview
	const [selectedLabel, setSelectedLabel] = useState<LabelInfo | null>(null);
	const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
	const [editMode, setEditMode] = useState<boolean>(false);

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
							sources: new Set(),
							values: new Map(),
						};
						labelInfoMap.set(key, labelInfo);
					}

					labelInfo.languages.add(file.language);
					labelInfo.sources.add(file.path);
					labelInfo.values.set(file.path, value);
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

	// Define app-level keybindings
	const appKeybindings = useMemo<Keybinding[]>(
		() => [
			{
				key: createKeyCombo('return'),
				label: 'Edit selected file',
				action: () => {
					if (selectedFile && !editMode) {
						setEditMode(true);
					}
				},
				showInHelp: true,
			},
		],
		[selectedFile, editMode]
	);

	// Use keybindings hook for app-level navigation
	useKeybindings(appKeybindings, 'app-navigation');

	useEffect(() => {
		// Set initial focus
		focusNext();
	}, [focusNext]);

	// Filter labels based on selected files - with memoization to prevent recalculation
	const visibleLabels = useMemo(() => {
		if (!isFileFilterActive || filteredFiles.size === 0) {
			return allLabels;
		}

		const allPathsInFilteredFiles = new Set(
			filteredFiles
				.values()
				.flatMap(file => file.paths)
				.toArray(),
		);

		return allLabels.filter(label => {
			return !label.item.sources.isDisjointFrom(allPathsInFilteredFiles);
		});
	}, [allLabels, filteredFiles, isFileFilterActive]);

	// Filter files based on selected labels - with memoization to prevent recalculation
	const visibleFiles = useMemo(() => {
		if (!isLabelFilterActive || filteredLabels.size === 0) {
			return allFiles;
		}

		const allPathsInFilteredLabels = new Set(
			filteredLabels
				.values()
				.flatMap(label => label.sources)
				.toArray(),
		);

		return allFiles.filter(file => {
			return !file.item.paths.isDisjointFrom(allPathsInFilteredLabels);
		});
	}, [allFiles, allLabels, filteredLabels, isLabelFilterActive]);

	// Handle label filter changes
	const handleLabelFilterChange = (
		filteredItems: Array<Item<LabelInfo>>,
		isActive: boolean,
	) => {
		const newFilteredIds = new Set(filteredItems.flatMap(item => item.item));
		setFilteredLabels(newFilteredIds);
		setIsLabelFilterActive(isActive);
	};

	// Handle file filter changes
	const handleFileFilterChange = (
		filteredItems: Array<Item<FileInfo>>,
		isActive: boolean,
	) => {
		const newFilteredIds = new Set(filteredItems.flatMap(item => item.item));
		setFilteredFiles(newFilteredIds);
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
					) : selectedFile && selectedFile.paths.size > 0 && editMode ? (
						<JsonEditor
							filePath={Array.from(selectedFile.paths)[0]}
							onExit={() => setEditMode(false)}
						/>
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
