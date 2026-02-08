"use client";

import { usePersona } from "./persona-context";

export function PersonaToggle() {
    const { persona, togglePersona } = usePersona();
    const isJoe = persona === "joe";

    return (
        <button
            onClick={togglePersona}
            className="group relative flex h-8 w-16 items-center rounded-full bg-theme-primary p-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
            aria-label={`Switch to ${isJoe ? "Joanna" : "Joe"}`}
        >
            {/* Sliding knob */}
            <span
                className="absolute h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out"
                style={{
                    left: isJoe ? "calc(100% - 28px)" : "4px",
                }}
            />
            {/* Label indicators */}
            <span
                className={`absolute left-1.5 text-[8px] font-bold text-white uppercase transition-opacity duration-200 ${isJoe ? "opacity-100" : "opacity-50"
                    }`}
            >
                J
            </span>
            <span
                className={`absolute right-1.5 text-[8px] font-bold text-white uppercase transition-opacity duration-200 ${isJoe ? "opacity-50" : "opacity-100"
                    }`}
            >
                J
            </span>
        </button>
    );
}
