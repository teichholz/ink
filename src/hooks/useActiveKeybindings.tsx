import { createContext, useContext, useState, useEffect } from 'react';
import { Keybinding } from './useKeybindings';

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
export function ActiveKeybindingsProvider({ children }: { children: React.ReactNode }) {
  const [keybindingsMap, setKeybindingsMap] = useState<Record<string, Keybinding[]>>({});
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);

  const registerKeybindings = (id: string, keybindings: Keybinding[]) => {
    setKeybindingsMap(prev => ({
      ...prev,
      [id]: keybindings,
    }));
  };

  const unregisterKeybindings = (id: string) => {
    setKeybindingsMap(prev => {
      const newMap = { ...prev };
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
export function useRegisterKeybindings(id: string, keybindings: Keybinding[], isFocused: boolean) {
  const { registerKeybindings, unregisterKeybindings, setActiveComponent } = useActiveKeybindings();

  // Register keybindings when component mounts
  useEffect(() => {
    registerKeybindings(id, keybindings);
    return () => unregisterKeybindings(id);
  }, [id, keybindings, registerKeybindings, unregisterKeybindings]);

  // Update active component when focus changes
  useEffect(() => {
    if (isFocused) {
      setActiveComponent(id);
    }
  }, [id, isFocused, setActiveComponent]);
}
