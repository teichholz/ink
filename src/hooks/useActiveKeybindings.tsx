import {createContext, useContext, useState, useEffect} from 'react';
import {Keybinding} from './useKeybindings.js';

// Create a context to track active keybindings across components
type ActiveKeybindingsContextType = {
	registerKeybindings: (id: string, keybindings: Keybinding[]) => void;
	unregisterKeybindings: (id: string) => void;
	setActiveComponent: (id: string | null) => void;
	getActiveKeybindings: () => Keybinding[];
	activeComponentId: string | null;
};

const ActiveKeybindingsContext = createContext<ActiveKeybindingsContextType>({
	registerKeybindings: () => {},
	unregisterKeybindings: () => {},
	setActiveComponent: () => {},
	getActiveKeybindings: () => [],
	activeComponentId: null,
});

/**
 * Provider component for active keybindings tracking
 */
export function ActiveKeybindingsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [keybindingsMap, setKeybindingsMap] = useState<
		Record<string, Keybinding[]>
	>({});
	const [activeComponentId, setActiveComponentId] = useState<string | null>(
		null,
	);

	const registerKeybindings = (id: string, keybindings: Keybinding[]) => {
		// Only update if keybindings have actually changed
		setKeybindingsMap(prev => {
			const prevBindings = prev[id];
			if (
				prevBindings &&
				prevBindings.length === keybindings.length &&
				JSON.stringify(prevBindings) === JSON.stringify(keybindings)
			) {
				return prev;
			}
			return {
				...prev,
				[id]: keybindings,
			};
		});
	};

	const unregisterKeybindings = (id: string) => {
		setKeybindingsMap(prev => {
			const newMap = {...prev};
			delete newMap[id];
			return newMap;
		});
	};

	const getActiveKeybindings = (): Keybinding[] => {
		if (!activeComponentId) return [];
		return keybindingsMap[activeComponentId] || [];
	};

	return (
		<ActiveKeybindingsContext.Provider
			value={{
				registerKeybindings,
				unregisterKeybindings,
				setActiveComponent: setActiveComponentId,
				getActiveKeybindings,
				activeComponentId,
			}}
		>
			{children}
		</ActiveKeybindingsContext.Provider>
	);
}

/**
 * Hook to track active keybindings across the application
 */
export function useActiveKeybindings() {
	return useContext(ActiveKeybindingsContext);
}

/**
 * Hook to register component keybindings and track when they become active
 */
export function useRegisterKeybindings(
	id: string,
	keybindings: Keybinding[],
	isFocused: boolean,
) {
	const {registerKeybindings, unregisterKeybindings, setActiveComponent} =
		useActiveKeybindings();

	// Register keybindings when component mounts
	useEffect(() => {
		registerKeybindings(id, keybindings);
		return () => unregisterKeybindings(id);
	}, [id, registerKeybindings, unregisterKeybindings]);

	// Update active component when focus changes, with debounce
	useEffect(() => {
		if (isFocused) {
			const timeoutId = setTimeout(() => {
				setActiveComponent(id);
			}, 1000);
			return () => clearTimeout(timeoutId);
		}

		return () => {};
	}, [id, isFocused, setActiveComponent]);
}
