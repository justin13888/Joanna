"use client";

import { useState, useCallback, useRef } from "react";
import { Bookshelf } from "@/app/_components/bookshelf-screen";
import { Diary } from "@/app/_components/diary";

/* Lavender gradients matching the shelf books */
const BOOK_CSS_GRADIENTS = [
	["#c4b5e3", "#9b8abf"],
	["#d8cfe8", "#b4a5d0"],
	["#b0a0cc", "#8878a8"],
	["#e0d8ec", "#c0b4d4"],
	["#ccc0dc", "#a494c0"],
	["#d4c8e0", "#a898c0"],
];
function getColors(year: number) {
	const pair = BOOK_CSS_GRADIENTS[year % BOOK_CSS_GRADIENTS.length] ?? BOOK_CSS_GRADIENTS[0]!;
	return { light: pair[0] ?? "#c4b5e3", dark: pair[1] ?? "#9b8abf" };
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
		floatingYear !== null ? getColors(floatingYear) : { light: "#c4b5e3", dark: "#9b8abf" };

	const showTurningBook = (anim === "pulling" || anim === "returning") && floatingYear !== null;
	const showExpandingBook = (anim === "opening" || anim === "closing") && floatingYear !== null;

	return (
		<div className="relative h-screen w-full overflow-hidden bg-[#faf7f2] font-patrick">
			{/* ─────── Bookshelf (z-0) ─────── */}
			<div className="absolute inset-0 z-0">
				<div className="flex h-full flex-col justify-center">
					<Bookshelf onSelectYear={handleSelect} selectedYear={shelfGap} />
					{anim === "idle" && (
						<p
							className="mt-6 text-center text-base text-stone-400/70"
							style={{ animation: "fade-in 0.6s ease-out" }}
						>
							Tap a book to start reading
						</p>
					)}
				</div>
			</div>

			{/* ─────── Stage 1: Pull + rotate 180° ─────── */}
			{showTurningBook && (
				<div
					className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
					style={{ perspective: "1200px" }}
				>
					<div
						style={{
							width: 80,
							height: 220,
							borderRadius: 4,
							transformStyle: "preserve-3d",
							animation:
								anim === "pulling"
									? "book-pull-turn 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards"
									: "book-turn-return 0.8s ease-in forwards",
						}}
					>
						{/* Face A (0°): SPINE */}
						<div
							className="absolute inset-0 flex items-center justify-center overflow-hidden"
							style={{
								borderRadius: "inherit",
								background: `linear-gradient(180deg, ${colors.light}, ${colors.dark})`,
								backfaceVisibility: "hidden",
								boxShadow: "2px 4px 12px rgba(0,0,0,0.2)",
							}}
						>
							<div className="absolute inset-y-0 left-0 w-[6px] rounded-l bg-black/10" />
							<div className="absolute inset-y-0 left-[6px] w-[2px] bg-white/20" />
							<span
								className="font-bold tracking-widest text-white/80 drop-shadow-sm"
								style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "0.95rem" }}
							>
								{floatingYear}
							</span>
							<div className="absolute top-3 inset-x-2 h-[2px] bg-white/20 rounded-full" />
							<div className="absolute bottom-3 inset-x-2 h-[2px] bg-white/20 rounded-full" />
						</div>

						{/* Face B (180°): PAGE EDGES — visible mid-rotation */}
						<div
							className="absolute inset-0 overflow-hidden"
							style={{
								borderRadius: "inherit",
								backfaceVisibility: "hidden",
								transform: "rotateY(180deg)",
								boxShadow: "2px 4px 16px rgba(0,0,0,0.18)",
							}}
						>
							<div
								className="absolute inset-0"
								style={{ background: "repeating-linear-gradient(to bottom, #f8f4ee 0px, #f8f4ee 2.5px, #ebe5db 2.5px, #ebe5db 3.5px)" }}
							/>
							<div
								className="absolute top-0 inset-x-0 h-[5px]"
								style={{ background: `linear-gradient(to right, ${colors.dark}, ${colors.light})`, borderRadius: "4px 4px 0 0" }}
							/>
							<div
								className="absolute bottom-0 inset-x-0 h-[5px]"
								style={{ background: `linear-gradient(to right, ${colors.dark}, ${colors.light})`, borderRadius: "0 0 4px 4px" }}
							/>
							<div
								className="absolute inset-y-0 left-0 w-[5px]"
								style={{ background: `linear-gradient(to bottom, ${colors.dark}, ${colors.light})` }}
							/>
						</div>

						{/* Face C (90°): FRONT COVER — what you see after the 90° turn */}
						<div
							className="absolute inset-0 flex items-center justify-center overflow-hidden"
							style={{
								borderRadius: "inherit",
								background: `linear-gradient(135deg, ${colors.dark}, ${colors.light})`,
								backfaceVisibility: "hidden",
								transform: "rotateY(90deg)",
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
							{/* Page edges on right */}
							<div
								className="absolute inset-y-1 right-0 w-[4px] rounded-r-[2px]"
								style={{ background: "repeating-linear-gradient(to bottom, #f5f0ea 0px, #f5f0ea 2px, #e8e2d8 2px, #e8e2d8 3px)" }}
							/>
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
							{/* Spine edge on left */}
							<div className="absolute inset-y-0 left-0 w-[8px] bg-black/10" />
							<div className="absolute inset-y-0 left-[8px] w-[2px] bg-white/15" />
							{/* Year text */}
							<div className="flex h-full w-full items-center justify-center">
								<span
									className="font-bold tracking-widest text-white/70 drop-shadow-md"
									style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "1.1rem" }}
								>
									{floatingYear}
								</span>
							</div>
							{/* Top/bottom edges */}
							<div className="absolute top-0 inset-x-0 h-px bg-white/20" />
							<div className="absolute bottom-0 inset-x-0 h-px bg-black/10" />
							{/* Decorative bands */}
							<div className="absolute top-4 inset-x-4 h-[2px] bg-white/15 rounded-full" />
							<div className="absolute bottom-4 inset-x-4 h-[2px] bg-white/15 rounded-full" />
							{/* Page edges on right (fore-edge) */}
							<div
								className="absolute inset-y-1 right-0 w-[4px] rounded-r-[2px]"
								style={{ background: "repeating-linear-gradient(to bottom, #f5f0ea 0px, #f5f0ea 2px, #e8e2d8 2px, #e8e2d8 3px)" }}
							/>
							{/* Subtle texture */}
							<div
								className="absolute inset-0 opacity-15"
								style={{ backgroundImage: "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.4) 0%, transparent 60%)" }}
							/>
						</div>
					</div>
				</div>
			)}

			{/* ─────── Diary (interactive, when fully open) ─────── */}
			{anim === "open" && selectedYear !== null && (
				<div
					className="absolute inset-0 z-20 overflow-y-auto bg-[#faf7f2]"
					style={{ animation: "fade-in 0.25s ease-out" }}
				>
					<div className="min-h-full px-2 py-4">
						<Diary year={selectedYear} onBack={handleClose} />
					</div>
				</div>
			)}
		</div>
	);
}
