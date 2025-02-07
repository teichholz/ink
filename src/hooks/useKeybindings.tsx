import {useInput, useFocus, Key} from 'ink';
import {useCallback, useMemo} from 'react';
import chalk from 'chalk';

/**
 * Helper function to create a KeyCombo
 */
export function createKeyCombo(
	key: LetterKey,
	modifiers: ModifierKey[] = [],
): KeyCombo {
	return {key, modifiers};
}

type ModifierKey = keyof Key;

type LetterKey =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z';

export type KeyCombo = {
	/**
	 * Letter key
	 */
	key: LetterKey;

	/**
	 * Modifier keys like ctrl, shift, meta, etc.
	 */
	modifiers?: ModifierKey[];
};

export type Keybinding = {
	/**
	 * The key or key combination to bind
	 */
	key: KeyCombo;

	/**
	 * Human-readable label describing what this keybinding does
	 */
	label: string;

	/**
	 * The action to perform when the key is pressed
	 */
	action: () => void;

	/**
	 * Whether this keybinding should only work when the component has focus
	 * @default true
	 */
	requiresFocus?: boolean;
};

/**
 * Hook for managing keyboard shortcuts with focus control
 *
 * @param keybindings Array of keybinding definitions
 * @param id Optional focus ID for the component
 * @returns Object with active keybindings and helper methods
 */
export function useKeybindings(keybindings: Keybinding[], id: string) {
	const {isFocused} = useFocus({id});

	/**
	 * Normalize key format to internal representation
	 */
	const normalizeKeyBinding = (
		keyBinding: KeyCombo,
	): {
		mainKey: string | keyof Key;
		modifiers: ModifierKey[];
	} => {
		return {
			mainKey: keyBinding.key,
			modifiers: keyBinding.modifiers || [],
		};
	};

	useInput((input, key) => {
		if (key.tab) {
			return;
		}

		for (const binding of keybindings) {
			if (binding.requiresFocus && !isFocused) {
				continue;
			}

			const {mainKey: letterKey, modifiers} = normalizeKeyBinding(binding.key);

			const modifiersMatch = modifiers.every(modifier => key[modifier]);
			if (!modifiersMatch) {
				continue;
			}

			const letterKeyMatches = input === letterKey;
			if (!letterKeyMatches) {
				continue;
			}

			binding.action();
		}
	});

	/**
	 * Format a key binding for display
	 */
	const formatKeyBinding = useCallback((keyBinding: KeyCombo): string => {
		const {mainKey, modifiers} = normalizeKeyBinding(keyBinding);

		const formattedModifiers = modifiers.map(mod => {
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

		const formattedMainKey = chalk.cyan(
			typeof mainKey === 'string' && mainKey.length === 1
				? mainKey.toUpperCase()
				: mainKey,
		);

		if (formattedModifiers.length > 0) {
			return `${formattedModifiers.join('+')}+${formattedMainKey}`;
		}

		return formattedMainKey;
	}, []);

	// Format keybindings as a pretty string for help text
	const getKeybindingsHelp = useCallback(() => {
		return keybindings
			.map(binding => {
				return `${formatKeyBinding(binding.key)}: ${binding.label}`;
			})
			.join('  ');
	}, [keybindings, formatKeyBinding]);

	// Get active keybindings (those that can be triggered in current focus state)
	const activeKeybindings = useMemo(() => {
		return keybindings.filter(
			binding => binding.requiresFocus === false || isFocused,
		);
	}, [keybindings, isFocused]);

	return {
		activeKeybindings,
		getKeybindingsHelp,
		isFocused,
	};
}
