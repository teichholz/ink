import chalk from 'chalk';
import {Box, Text, useInput} from 'ink';
import {useState} from 'react';
import {useStdoutDimensions} from '../hooks/useStdoutDimensions.js';

export type NotificationProps = {
	title?: string;
	message: string;
	size?: number;
	onDismiss?: () => void;
};

/**
 * A notification component that displays a message with an optional title
 * Can be dismissed with Enter or Escape
 */
export function Notification({
	title,
	message,
	onDismiss,
	size = 2,
}: NotificationProps) {
	const [cols, rows] = useStdoutDimensions();
	useInput((_input, key) => {
		if (key.return || key.escape) {
			onDismiss?.();
		}
	});

	// Calculate notification dimensions
	const notificationWidth = cols / size;
	const notificationHeight = rows / size;

	// Calculate center position
	const left = Math.floor((cols - notificationWidth) / 2);
	const top = Math.floor((rows - notificationHeight) / 2);

	return (
		<Box
			position="absolute"
			marginLeft={left}
			marginTop={top}
			flexDirection="column"
			borderStyle="round"
			borderColor="yellow"
			padding={1}
			width={notificationWidth}
			height={notificationHeight}
		>
			{title && (
				<Box marginBottom={1}>
					<Text bold>{chalk.yellow(title)}</Text>
				</Box>
			)}
			<Text>{message}</Text>
			<Box marginTop={1}>
				<Text dimColor>Press Enter or Escape to dismiss</Text>
			</Box>
		</Box>
	);
}

/**
 * Hook to manage notifications
 * @returns Functions and state to manage notifications
 */
export function useNotification() {
	const [notification, setNotification] = useState<NotificationProps | null>(
		null,
	);

	const showNotification = (props: NotificationProps) => {
		setNotification({
			...props,
			onDismiss: () => {
				props.onDismiss?.();
				setNotification(null);
			},
		});
	};

	const dismissNotification = () => {
		setNotification(null);
	};

	return {
		notification,
		showNotification,
		dismissNotification,
		NotificationComponent: notification ? (
			<Notification {...notification} />
		) : null,
	};
}
