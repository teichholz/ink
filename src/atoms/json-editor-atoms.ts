import { atom } from 'jotai';

// Define the type for string changes
export type StringChange = {
  path: string;
  value: string;
  timestamp: number;
};

// Create an atom to store the history of string changes
export const stringChangesAtom = atom<StringChange[]>([]);

// Atom to add a new change to the history
export const addStringChangeAtom = atom(
  (get) => get(stringChangesAtom),
  (get, set, newChange: Omit<StringChange, 'timestamp'>) => {
    const change: StringChange = {
      ...newChange,
      timestamp: Date.now(),
    };
    set(stringChangesAtom, [...get(stringChangesAtom), change]);
  }
);
