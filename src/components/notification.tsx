import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { LiteralUnion } from 'type-fest';
import { useStdoutDimensions } from '../hooks/useStdoutDimensions.js';
import { atom, useAtom } from 'jotai';

export type NotificationProps = {
	title?: string;
	message: string;
	size?: LiteralUnion<'1/2' | '2/3' | '3/4', string>;
	style?: 'info' | 'warning';
	transparent?: boolean;
	onDismiss?: () => void;
};

/**
 * A notification component that displays a message with an optional title
 * Can be dismissed with Enter or Escape
 */
export function Notification({
	title = '',
	message,
	onDismiss = () => { },
	size = '1/2',
	transparent = false,
	style = 'info',
}: NotificationProps) {
	const [cols, rows] = useStdoutDimensions();

	useInput((_input, key) => {
		if (key.return || key.escape) {
			onDismiss?.();
		}
	});

	// Calculate notification dimensions
	const [nom, denom] = size.toString().split('/');
	let notificationWidth;
	let notificationHeight;

	if (!nom || !denom) {
		notificationWidth = cols / 2;
		notificationHeight = rows / 2;
	} else {
		notificationWidth = (cols * parseInt(nom)) / parseInt(denom);
		notificationHeight = (rows * parseInt(nom)) / parseInt(denom);
	}

	// Calculate center position
	const left = Math.floor((cols - notificationWidth) / 2);
	const top = Math.floor((rows - notificationHeight) / 2);

	return (
		<>
			{!transparent &&
				<Box
					position="absolute"
					marginLeft={left}
					marginTop={top}
					width={notificationWidth}
					height={notificationHeight}
				>
					<Text>{' '.repeat(notificationHeight * notificationWidth)}</Text>
				</Box>
			}
			<Box
				position="absolute"
				marginLeft={left}
				marginTop={top}
				flexDirection="column"
				borderStyle="round"
				borderColor={style === 'warning' ? 'red' : 'green'}
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
		</>
	);
}

const notificationAtom = atom<NotificationProps | null>(null);

/**
 * Hook to manage notifications
 * @returns Functions and state to manage notifications
 */
export function useNotification() {
	const [notification, setNotification] = useAtom(notificationAtom);

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
