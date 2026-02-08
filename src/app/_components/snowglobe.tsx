"use client";

import { usePersona } from "./persona-context";
import { useEffect, useState } from "react";

export function Snowglobe() {
    const { persona, togglePersona } = usePersona();
    const isJoe = persona === "joe";
    const [shaking, setShaking] = useState(false);

    const handleClick = () => {
        setShaking(true);
        // Reset shake animation
        setTimeout(() => setShaking(false), 500);
        togglePersona();
    };

    // Determine internal colors based on persona
    // Joanna: Purple, Joe: Green
    const primaryColor = isJoe ? "#22c55e" : "#8b5cf6"; // green-500 : violet-500
    const particleColor = isJoe ? "#bbf7d0" : "#ddd6fe"; // green-200 : violet-200

    return (
        <button
            onClick={handleClick}
            className={`group relative flex flex-col items-center justify-end outline-none transition-transform duration-300 hover:scale-105 active:scale-95 ${shaking ? "animate-shake" : ""}`}
            style={{
                width: 70,
                height: 90,
                cursor: "pointer",
                transformOrigin: "bottom center",
            }}
            aria-label={`Switch to ${isJoe ? "Joanna" : "Joe"}`}
        >
            <style jsx>{`
				@keyframes float {
					0% { transform: translateY(0px) translateX(0px); }
					100% { transform: translateY(-4px) translateX(2px); }
				}
				@keyframes shake {
					0% { transform: rotate(0deg); }
					25% { transform: rotate(-8deg); }
					50% { transform: rotate(8deg); }
					75% { transform: rotate(-4deg); }
					100% { transform: rotate(0deg); }
				}
				.animate-shake {
					animation: shake 0.4s ease-in-out;
				}
			`}</style>

            {/* ─── Glass Dome ─── */}
            <div
                className="relative z-10 flex items-end justify-center overflow-hidden rounded-t-[35px] border border-white/40 bg-white/10 backdrop-blur-[1px]"
                style={{
                    width: 56,
                    height: 60,
                    boxShadow: "inset 0 4px 10px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)",
                }}
            >
                {/* Reflections on glass */}
                <div className="absolute top-2 left-3 h-4 w-2 -rotate-12 rounded-full bg-white/40 blur-[1px]" />
                <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-white/60 blur-[0.5px]" />

                {/* ─── Internal Scene ─── */}
                <div className="absolute inset-0 flex items-center justify-center pb-2">
                    {/* Central object (simple tree/crystal shape) */}
                    <div
                        className="transition-all duration-500 ease-spring"
                        style={{
                            width: 0,
                            height: 0,
                            borderLeft: "14px solid transparent",
                            borderRight: "14px solid transparent",
                            borderBottom: `42px solid ${primaryColor}`,
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                            transform: isJoe ? "scale(1.1)" : "scale(1)",
                        }}
                    />
                </div>

                {/* ─── Snow Particles ─── */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-[35px]">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full transition-colors duration-500"
                            style={{
                                width: i % 3 === 0 ? 4 : 2,
                                height: i % 3 === 0 ? 4 : 2,
                                backgroundColor: particleColor,
                                top: `${15 + i * 10}%`,
                                left: `${15 + i * 12}%`,
                                boxShadow: "0 0 2px rgba(255,255,255,0.9)",
                                animation: `float ${2 + i * 0.4}s ease-in-out infinite alternate`,
                                opacity: 0.8,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ─── Base ─── */}
            <div
                className="relative z-20 -mt-1 h-6 w-full rounded-sm flex items-center justify-center"
                style={{
                    width: 64,
                    background: "linear-gradient(to right, #5c4033, #8b5a2b, #5c4033)",
                    boxShadow: "0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                    borderRadius: "4px",
                }}
            >
                {/* Wood knob/plaque */}
                <div
                    className="h-3.5 w-[42px] rounded-[2px] bg-[#4a3225] shadow-inner flex items-center justify-center border border-[#3e2b20]"
                >
                    <span className="text-[7px] font-bold text-[#e6cbb5] uppercase tracking-wider scale-90">
                        {isJoe ? "JOE" : "JOANNA"}
                    </span>
                </div>
            </div>
        </button>
    );
}
