import { atom } from "jotai";

// Define the type for string changes
export type JsonEdit = {
	/**
	 * json pointer
	 */
	path: string;
	/**
	 * If the edit changed the value of a label, this is the label
	 */
	label?: string;
	originalValue: string;
	value: string;
	timestamp: number;
	filePath: string;
};

// Create an atom to store the history of string changes
export const jsonEditAtom = atom<JsonEdit[]>([]);

export const amountOfjsonEditsAtom = atom((get) => get(jsonEditAtom).length);

// Atom to add a new change to the history
export const addJsonEditAtom = atom(
	(get) => get(jsonEditAtom),
	(get, set, newChange: Omit<JsonEdit, "timestamp">) => {
		const change: JsonEdit = {
			...newChange,
			timestamp: Date.now(),
		};

		// Get current changes
		const currentChanges = get(jsonEditAtom);

		// Filter out any previous changes to the same path in the same file
		const filteredChanges = currentChanges.filter(
			(existingChange) =>
				!(
					existingChange.path === newChange.path &&
					existingChange.filePath === newChange.filePath
				),
		);

		// Add the new change
		set(jsonEditAtom, [...filteredChanges, change]);
	},
);

// Atom to remove a specific edit from the history
export const removeJsonEditAtom = atom(
	(get) => get(jsonEditAtom),
	(get, set, editToRemove: JsonEdit) => {
		// Get current changes
		const currentChanges = get(jsonEditAtom);

		// Filter out the edit to remove
		const filteredChanges = currentChanges.filter(
			(existingEdit) =>
				!(
					existingEdit.path === editToRemove.path &&
					existingEdit.filePath === editToRemove.filePath &&
					existingEdit.timestamp === editToRemove.timestamp
				),
		);

		// Update the atom with the filtered changes
		set(jsonEditAtom, filteredChanges);
	},
);
