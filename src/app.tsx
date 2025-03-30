import chalk from 'chalk';
import {Box, Text, useFocusManager} from 'ink';
import {useEffect, useMemo, useState} from 'react';
import Filter, {FilterItem} from './components/filter.js';
import {useNotification} from './components/notification.js';
import {Config} from './config.js';
import {
	ActiveKeybindingsProvider,
	useActiveKeybindings,
} from './hooks/useActiveKeybindings.js';
import {useStdoutDimensions} from './hooks/useStdoutDimensions.js';
import {logger} from './logger.js';
import {File, Tools, extractLabelsFromFile, find} from './tools.js';

type Props = {
	name: string | undefined;
	tools: Tools;
	config: Config;
};

// Type for storing label information
type LabelInfo = {
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
	sources: Map<File, unknown>; // Maps file path to the label value
};

interface Item<T> extends FilterItem {
	item: T;
}

// Wrap the app with the ActiveKeybindingsProvider
export default function App(props: Props) {
	return (
		<ActiveKeybindingsProvider>
			<AppContent {...props} />
		</ActiveKeybindingsProvider>
	);
}

function AppContent({tools, config}: Props) {
	const [allFiles, setAllFiles] = useState<Array<Item<File>>>([]);
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

	const [cols, rows] = useStdoutDimensions();
	const {focusNext} = useFocusManager();
	const {showNotification, NotificationComponent} = useNotification();

	useEffect(() => {
		logger.info({config}, 'Starting application');
		const loadFilesAndLabels = async () => {
			const fileItems: Array<Item<File>> = [];
			const seenRootFileNames = new Set<string>();
			const labelInfoMap = new Map<string, LabelInfo>();

			for await (const file of find(tools.fd, config)) {
				logger.info(`Loading labels for ${file.path}`);

				// Only add file once to the file list to avoid duplicates
				// We still need to extract labels from the file
				if (!seenRootFileNames.has(file.rootFileName)) {
					seenRootFileNames.add(file.rootFileName);
					fileItems.push({
						id: file.path,
						name: file.rootFileName,
						item: file,
					});
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
					labelInfo.sources.set(file, value);
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
		if (!isFileFilterActive || filteredFileIds.size === 0) {
			return allLabels;
		}

		return allLabels.filter(label => {
			// Check if any of the label's sources are in the filtered files
			for (const file of label.item.sources.keys()) {
				if (filteredFileIds.has(file.path)) {
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

		// Create a lookup map for faster checking
		const filteredLabelIdsSet = filteredLabelIds;

		return allFiles.filter(file => {
			// Check if this file contains any of the filtered labels
			return allLabels.some(
				label =>
					filteredLabelIdsSet.has(label.id) &&
					label.item.sources.has(file.item),
			);
		});
	}, [allFiles, allLabels, filteredLabelIds, isLabelFilterActive]);

	// Handle label filter changes
	const handleLabelFilterChange = (
		filteredItems: Array<{id: string}>,
		isActive: boolean,
	) => {
		const newFilteredIds = new Set(filteredItems.map(item => item.id));
		setFilteredLabelIds(newFilteredIds);
		setIsLabelFilterActive(isActive);
		logger.debug(
			{
				filteredLabelCount: newFilteredIds.size,
				isActive,
			},
			'Label filter changed',
		);
	};

	// Handle file filter changes
	const handleFileFilterChange = (
		filteredItems: Array<{id: string}>,
		isActive: boolean,
	) => {
		const newFilteredIds = new Set(filteredItems.map(item => item.id));
		setFilteredFileIds(newFilteredIds);
		setIsFileFilterActive(isActive);
		logger.debug(
			{
				filteredFileCount: newFilteredIds.size,
				isActive,
			},
			'File filter changed',
		);
	};

	// Get active keybindings
	const activeKeybindingsContext = useActiveKeybindings();
	const {getActiveKeybindings, activeComponentId} = activeKeybindingsContext;
	const activeKeybindings = useMemo(
		() => getActiveKeybindings(),
		[activeComponentId, getActiveKeybindings],
	);

	// Format keybindings for display
	const formatKeyBinding = useMemo(() => {
		return (binding: any) => {
			if (!binding || !binding.key) {
				return '';
			}

			const {key, label} = binding;
			const modifiers = key.modifiers || [];

			const formattedModifiers = modifiers.map((mod: string) => {
				switch (mod) {
					case 'ctrl':
						return chalk.cyan('Ctrl');
					case 'shift':
						return chalk.cyan('Shift');
					case 'meta':
						return chalk.cyan('Meta');
					default:
						return chalk.cyan(mod);
				}
			});

			const formattedKey = chalk.cyan(key.key.toUpperCase());

			if (formattedModifiers.length > 0) {
				return `${formattedModifiers.join('+')}+${formattedKey}: ${label}`;
			}

			return `${formattedKey}: ${label}`;
		};
	}, []);

	return (
		<Box height={rows} width={cols} flexDirection="column">
			<Box height="90%" width="100%" flexDirection="row">
				<Box width="25%" flexDirection="column">
					<Filter
						id="filter1"
						items={visibleLabels}
						placeholder="Filter by label"
						suffix={item =>
							` (${chalk.yellow(Array.from(item.item.languages).join(', '))})`
						}
						onFilterChange={handleLabelFilterChange}
					/>
					<Filter
						id="filter2"
						items={visibleFiles}
						placeholder="Filter by file"
						onFilterChange={handleFileFilterChange}
					/>
				</Box>
				<Box width="75%" borderStyle="round" flexDirection="column" />
			</Box>

			<Box
				height="10%"
				width="100%"
				borderStyle="round"
				flexDirection="column"
				padding={1}
			>
				{useMemo(
					() => (
						<Text>
							{activeComponentId ? (
								<>
									{chalk.bold(`Active keybindings for ${activeComponentId}:`)}{' '}
									{activeKeybindings.length > 0
										? activeKeybindings.map(formatKeyBinding).join('  ')
										: chalk.gray('No keybindings available')}
								</>
							) : (
								chalk.gray('No active component')
							)}
						</Text>
					),
					[activeComponentId, activeKeybindings, formatKeyBinding],
				)}
			</Box>
			{NotificationComponent}
		</Box>
	);
}
