"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Persona = "joanna" | "joe";

const STORAGE_KEY = "persona-preference";

interface PersonaContextType {
    persona: Persona;
    togglePersona: () => void;
    name: string;
}

const PersonaContext = createContext<PersonaContextType | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
    const [persona, setPersona] = useState<Persona>("joanna");
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on mount and sync state
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "joe") {
            setPersona("joe");
        }
        setIsInitialized(true);
    }, []);

    // Sync changes to DOM and localStorage, but only after initialization
    // This prevents overriding the script's work during the first render
    useEffect(() => {
        if (!isInitialized) return;

        if (persona === "joe") {
            document.documentElement.classList.add("theme-joe");
            localStorage.setItem(STORAGE_KEY, "joe");
        } else {
            document.documentElement.classList.remove("theme-joe");
            localStorage.setItem(STORAGE_KEY, "joanna");
        }
    }, [persona, isInitialized]);

    const togglePersona = useCallback(() => {
        setPersona((p) => (p === "joanna" ? "joe" : "joanna"));
    }, []);

    const name = persona === "joanna" ? "Joanna" : "Joe";

    return (
        <PersonaContext.Provider value={{ persona, togglePersona, name }}>
            {children}
        </PersonaContext.Provider>
    );
}

export function usePersona() {
    const context = useContext(PersonaContext);
    if (!context) {
        throw new Error("usePersona must be used within a PersonaProvider");
    }
    return context;
}
