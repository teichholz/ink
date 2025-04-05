import chalk from 'chalk';
import {Key, useFocus, useInput} from 'ink';
import {atom, useAtom} from 'jotai';
import {useCallback, useEffect} from 'react';

/**
 * Helper function to create a KeyCombo
 */
export function createKeyCombo(
	key: LetterKey,
	modifiers: ModifierKey[] = [],
): KeyCombo {
	return {key, modifiers};
}

type ActiveKeybindings = {
	pretty: () => string;
	keybindings: Keybinding[];
};

export const globalKeybindings = atom<ActiveKeybindings>();
export const currentFocusedKeybindings = atom<ActiveKeybindings>();

type ModifierKey = keyof Key;

type LetterKey =
	| ''
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
	| 'z'
	| '?';

export type KeyCombo = {
	/**
	 * Letter key
	 */
	key?: LetterKey;

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
	 * When provided, the keybinding will only be active when the predicate returns true
	 */
	predicate?: () => boolean;

	/**
	 * Whether this keybinding should only work when the component has focus
	 * @default true
	 */
	requiresFocus?: boolean;

	/**
	 * Whether to show this keybinding in the help text
	 * @default false
	 */
	showInHelp?: boolean;
};

export function useGlobalKeybindings(keybindings: Keybinding[], id: string) {
	keybindings.forEach(binding => {
		binding.requiresFocus = false;
	});

	return useKeybindings(keybindings, id, true);
}

/**
 * Hook for managing keyboard shortcuts with focus control
 *
 * @param keybindings Array of keybinding definitions
 * @param id Optional focus ID for the component
 * @returns Object with active keybindings and helper methods
 */
export function useKeybindings(
	keybindings: Keybinding[],
	id: string,
	global = false,
) {
	const local = !global;
	const {isFocused} = local ? useFocus({id}) : {isFocused: true};

	// defaults
	keybindings.forEach(binding => {
		binding.requiresFocus = binding.requiresFocus ?? true;
		binding.showInHelp = binding.showInHelp ?? false;
		binding.predicate = binding.predicate ?? (() => true);
	});

	/**
	 * Normalize key format to internal representation
	 */

	useInput((input, key) => {
		for (const binding of keybindings) {
			if (binding.requiresFocus && !isFocused) {
				continue;
			}

			if (!binding.predicate?.()) {
				continue;
			}

			const {mainKey: letterKey, modifiers} = normalizeKeyBinding(binding.key);

			const modifiersMatch = modifiers.every(modifier => key[modifier]);
			if (!modifiersMatch) {
				continue;
			}

			// if the binding has no letter, execute it now
			if (!letterKey) {
				binding.action();
				continue;
			}

			const letterKeyMatches = input === letterKey;
			if (!letterKeyMatches) {
				continue;
			}

			binding.action();
		}
	});

	// Format keybindings as a pretty string for help text
	const getKeybindingsHelp = useCallback(() => {
		return keybindings
			.filter(binding => binding.predicate?.())
			.map(formatKeyBinding)
			.filter(Boolean)
			.join('  ');
	}, [keybindings, formatKeyBinding]);

	const [_1, setActiveKeybindings] = useAtom(currentFocusedKeybindings);
	const [_2, setActiveKeybindingsGlobal] = useAtom(globalKeybindings);

	if (local) {
		useEffect(() => {
			if (isFocused) {
				setActiveKeybindings({
					pretty: getKeybindingsHelp,
					keybindings,
				});
			}
		}, [isFocused, keybindings]);
	}

	if (global) {
		useEffect(() => {
			setActiveKeybindingsGlobal({
				pretty: getKeybindingsHelp,
				keybindings,
			});
		}, [keybindings]);
	}

	return {
		getKeybindingsHelp,
		isFocused,
	};
}

function normalizeKeyBinding(keyBinding: KeyCombo): {
	mainKey?: string | keyof Key;
	modifiers: ModifierKey[];
} {
	return {
		mainKey: keyBinding.key,
		modifiers: keyBinding.modifiers ?? [],
	};
}

/**
 * Format a key binding for display
 */
export function formatKeyBinding(keybinding: Keybinding): string {
	const {mainKey, modifiers} = normalizeKeyBinding(keybinding.key);

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
		return (
			formattedModifiers.join('+') +
			(formattedMainKey ? `+${formattedMainKey}` : '') +
			`: ${keybinding.label}`
		);
	}

	return formattedMainKey + `: ${keybinding.label}`;
}
