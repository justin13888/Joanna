"use client";

import { useState, useCallback, useRef } from "react";
import { Bookshelf } from "@/app/_components/bookshelf-screen";
import { Diary } from "@/app/_components/diary";
import { usePersona } from "../_components/persona-context";

/* Vibrant gradients matching the shelf books */
const BOOK_CSS_GRADIENTS = [
	["#a78bfa", "#7c3aed"], // vibrant purple
	["#c4b5e3", "#9b8abf"], // medium lavender
	["#d8cfe8", "#b4a5d0"], // light lavender
	["#b0a0cc", "#8878a8"], // deeper lavender
	["#e9d5ff", "#a855f7"], // electric purple
	["#f5f0ea", "#d8cfe8"], // cream/lavender mix
];

const JOE_GRADIENTS = [
	["#86efac", "#22c55e"], // green-300 / green-500
	["#bbf7d0", "#4ade80"], // green-200 / green-400
	["#4ade80", "#16a34a"], // green-400 / green-600
	["#dcfce7", "#86efac"], // green-100 / green-300
	["#86efac", "#15803d"], // green-300 / green-700
	["#f0fdf4", "#bbf7d0"], // cream/green mix
];

function getColors(year: number, isJoe: boolean) {
	const source = isJoe ? JOE_GRADIENTS : BOOK_CSS_GRADIENTS;
	const pair =
		source[year % source.length] ?? source[0]!;
	return { light: pair[0] ?? "#ffd93d", dark: pair[1] ?? "#ff9a3c" };
}

/*
 *  Flow:
 *   idle      → bookshelf
 *   pulling   → book rises + rotates 180°                             (800ms)
 *   opening   → book-sized wrapper expands to full screen while
 *               covers swing open from the middle simultaneously      (1000ms)
 *   open      → diary interactive
 *   closing   → covers close + wrapper shrinks back to book size      (1000ms)
 *   returning → book rotates back + slides into shelf                 (800ms)
 */
type Anim = "idle" | "pulling" | "opening" | "open" | "closing" | "returning";

export default function DiaryPage() {
	const { persona } = usePersona();
	const isJoe = persona === "joe";
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [anim, setAnim] = useState<Anim>("idle");
	const [floatingYear, setFloatingYear] = useState<number | null>(null);
	const pendingRef = useRef<number | null>(null);

	const startOpen = useCallback((year: number) => {
		setSelectedYear(year);
		setFloatingYear(year);
		setAnim("pulling");
		setTimeout(() => {
			setAnim("opening");
			setTimeout(() => setAnim("open"), 1000);
		}, 800);
	}, []);

	const handleClose = useCallback(() => {
		if (anim !== "open") return;
		setFloatingYear(selectedYear);
		setAnim("closing");
		setTimeout(() => {
			setAnim("returning");
			setTimeout(() => {
				const next = pendingRef.current;
				pendingRef.current = null;
				if (next !== null) {
					startOpen(next);
				} else {
					setSelectedYear(null);
					setFloatingYear(null);
					setAnim("idle");
				}
			}, 800);
		}, 1000);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [anim, selectedYear, startOpen]);

	const handleSelect = useCallback(
		(year: number) => {
			if (anim !== "idle" && anim !== "open") return;
			if (year === selectedYear && anim === "open") {
				handleClose();
				return;
			}
			if (anim === "open" && selectedYear !== null) {
				pendingRef.current = year;
				handleClose();
				return;
			}
			startOpen(year);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[anim, selectedYear, startOpen, handleClose],
	);

	const bookGone = anim !== "idle";
	const shelfGap = bookGone ? (floatingYear ?? selectedYear) : null;
	const colors =
		floatingYear !== null ? getColors(floatingYear, isJoe) : { light: isJoe ? "#86efac" : "#c4b5e3", dark: isJoe ? "#22c55e" : "#9b8abf" };

	const showTurningBook = (anim === "pulling" || anim === "returning") && floatingYear !== null;
	const showExpandingBook = (anim === "opening" || anim === "closing") && floatingYear !== null;

	return (
		<div className="relative h-screen w-full overflow-hidden diary-bg font-patrick">
			{/* ─────── Bookshelf (z-0) ─────── */}
			<div className="absolute inset-0 z-0 flex flex-col">
				<div className="flex flex-1 flex-col justify-center min-h-0">
					<Bookshelf onSelectYear={handleSelect} selectedYear={shelfGap} />
					{anim === "idle" && (
						<p
							className="mt-4 text-center text-sm text-amber-900/60"
							style={{ animation: "fade-in 0.6s ease-out" }}
						>
							Tap a diary to open
						</p>
					)}
				</div>
			</div>

			{showTurningBook && (
				<div
					className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
				>
					<div
						style={{
							width: 80,
							height: 220,
							borderRadius: 4,
							animation:
								anim === "pulling"
									? "book-pull-turn 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards"
									: "book-turn-return 0.8s ease-in forwards",
						}}
					>
						{/* Front cover view */}
						<div
							className="absolute inset-0 flex items-center justify-center overflow-hidden"
							style={{
								borderRadius: "inherit",
								background: `linear-gradient(135deg, ${colors.dark}, ${colors.light})`,
								boxShadow: "2px 4px 16px rgba(0,0,0,0.2)",
							}}
						>
							{/* Spine edge on left */}
							<div className="absolute inset-y-0 left-0 w-[8px] bg-black/10" style={{ borderRadius: "inherit", borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
							<div className="absolute inset-y-0 left-[8px] w-[2px] bg-white/15" />
							{/* Year text */}
							<span
								className="font-bold tracking-widest text-white/80 drop-shadow-md"
								style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "1rem" }}
							>
								{floatingYear}
							</span>
							{/* Decorative bands */}
							<div className="absolute top-3 inset-x-4 h-[2px] bg-white/15 rounded-full" />
							<div className="absolute bottom-3 inset-x-4 h-[2px] bg-white/15 rounded-full" />
						</div>
					</div>
				</div>
			)}

			{/* ─────── Stage 2: Book expands + front cover swings open ─────── */}
			{showExpandingBook && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
					<div
						className="relative"
						style={{
							perspective: "1200px",
							willChange: "width, height, border-radius",
							animation:
								anim === "opening"
									? "book-expand 1s cubic-bezier(0.22,0.61,0.36,1) forwards"
									: "book-shrink 1s ease-in-out forwards",
						}}
					>
						{/* Pages layer (cream paper behind the cover) */}
						<div
							className="absolute inset-0 overflow-hidden"
							style={{
								borderRadius: "inherit",
								background: "#f5f0ea",
								boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
							}}
						/>

						{/* Spiral binding - center coils */}
						<div
							className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-2"
							style={{
								width: 48,
								zIndex: 10,
								animation:
									anim === "opening"
										? "spiral-appear 1s ease-in-out forwards"
										: anim === "closing"
											? "spiral-disappear 1s ease-in-out forwards"
											: "none",
								opacity: anim === "opening" ? 0 : 1, // Start at 0 for appear animation
							}}
						>
							{Array.from({ length: 18 }).map((_, i) => (
								<div key={i} className="spiral-coil" />
							))}
						</div>

						{/* Spine strip on the left */}
						<div
							className="absolute top-0 bottom-0 left-0 w-[8px]"
							style={{
								borderRadius: "inherit",
								borderTopRightRadius: 0,
								borderBottomRightRadius: 0,
								background: `linear-gradient(to bottom, ${colors.dark}, ${colors.light})`,
								boxShadow: "2px 0 6px rgba(0,0,0,0.1)",
							}}
						/>

						{/* FRONT COVER — full width, hinges at LEFT (spine), swings open to the left */}
						<div
							className="absolute inset-0 overflow-hidden"
							style={{
								borderRadius: "inherit",
								background: `linear-gradient(135deg, ${colors.dark}, ${colors.light})`,
								transformOrigin: "left center",
								transformStyle: "preserve-3d",
								backfaceVisibility: "hidden",
								animation:
									anim === "opening"
										? "cover-open 1s cubic-bezier(0.22,0.61,0.36,1) forwards"
										: "cover-close 1s ease-in-out forwards",
								boxShadow: "4px 4px 16px rgba(0,0,0,0.2)",
							}}
						>
							{/* Spine edge details */}
							<div className="absolute inset-y-0 left-0 w-[14px] bg-gradient-to-r from-black/20 via-white/10 to-transparent" />

							{/* Stitching Line */}
							<div className="absolute inset-y-0 left-[4px] w-[2px] opacity-20"
								style={{ backgroundImage: "repeating-linear-gradient(to bottom, #fff 0px, #fff 4px, transparent 4px, transparent 8px)" }} />

							{/* Hinge Line */}
							<div className="absolute inset-y-0 left-[12px] w-[2px] bg-black/5" />
							<div className="absolute inset-y-0 left-[14px] w-px bg-white/10" />

							{/* Year text */}
							<div className="flex h-full w-full items-center justify-center">
								<span
									className="font-bold tracking-widest text-white/80 drop-shadow-md"
									style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "1.1rem", opacity: 0.9 }}
								>
									{floatingYear}
								</span>
							</div>
							{/* Top/bottom edges */}
							<div className="absolute top-0 inset-x-0 h-px bg-white/20" />
							<div className="absolute bottom-0 inset-x-0 h-px bg-black/10" />
							{/* Decorative bands */}
							<div className="absolute top-4 inset-x-4 h-[2px] bg-white/10 rounded-full" />
							<div className="absolute bottom-4 inset-x-4 h-[2px] bg-white/10 rounded-full" />
							{/* Subtle texture */}
							<div
								className="absolute inset-0 opacity-10"
								style={{ backgroundImage: "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.4) 0%, transparent 60%)" }}
							/>
						</div>
					</div>
				</div>
			)}

			{/* ─────── Diary (interactive, when fully open) ─────── */}
			{anim === "open" && selectedYear !== null && (
				<div
					className="absolute inset-0 z-20 flex items-center justify-center"
					style={{ animation: "fade-in 0.25s ease-out" }}
				>
					<Diary year={selectedYear} onBack={handleClose} />
				</div>
			)}
		</div>
	);
}
