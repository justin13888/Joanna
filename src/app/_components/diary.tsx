"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	months,
	weekdays,
	getEntryMap,
	getCalendarGrid,
	dateKey,
	formatDateLong,
	type DiaryEntry,
	diaryEntries,
	memoriesToDiaryEntries,
} from "./diary-data";
import { api } from "@/trpc/react";
import { PersonaToggle } from "./persona-toggle";
const PAGE_HEIGHT_NUM = 620;
const PAGE_HEIGHT = `${PAGE_HEIGHT_NUM}px`;
const PAGE_WIDTH = 420;
const SPIRAL_WIDTH = 28;
const PAGE_EDGE_COUNT = 5;
const COIL_COUNT = 18;
const COIL_HEIGHT = 24;
const COIL_GAP = 10; // matches sm:gap-2.5
const HOLE_RADIUS = 9;

/**
 * Compute the Y-center positions of each hole to match the spiral coil layout.
 */
function computeHoleCenters(): number[] {
	const totalContent =
		COIL_COUNT * COIL_HEIGHT + (COIL_COUNT - 1) * COIL_GAP;
	const topOffset = (PAGE_HEIGHT_NUM - totalContent) / 2;
	const centers: number[] = [];
	for (let i = 0; i < COIL_COUNT; i++) {
		centers.push(
			topOffset + i * (COIL_HEIGHT + COIL_GAP) + COIL_HEIGHT / 2,
		);
	}
	return centers;
}

/**
 * Generate an SVG mask that cuts transparent holes out of the page.
 * White = visible, black = transparent (hole).
 */
function buildHoleMask(
	width: number,
	height: number,
	holeSide: "left" | "right",
	centers: number[],
): string {
	const cx = holeSide === "left" ? HOLE_RADIUS - 1 : width - HOLE_RADIUS + 1;
	const circles = centers
		.map(
			(cy) =>
				`<circle cx="${cx}" cy="${cy}" r="${HOLE_RADIUS}" fill="black"/>`,
		)
		.join("");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/>${circles}</svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Decorative shadow rings around each hole for depth.
 */
function HoleRings({
	side,
	centers,
}: { side: "left" | "right"; centers: number[] }) {
	return (
		<>
			{centers.map((cy) => (
				<div
					key={cy}
					className="pointer-events-none absolute"
					style={{
						[side === "left" ? "left" : "right"]: -1,
						top: cy - HOLE_RADIUS,
						width: HOLE_RADIUS * 2,
						height: HOLE_RADIUS * 2,
						borderRadius: "50%",
						boxShadow:
							"inset 0 2px 4px rgba(40,20,70,0.3), inset 0 -1px 2px rgba(255,255,255,0.15)",
						zIndex: 35,
					}}
				/>
			))}
		</>
	);
}

export function Diary() {
	const [selectedMonth, setSelectedMonth] = useState(1);
	const [selectedYear, setSelectedYear] = useState(2026);
	const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
	const [isFlipping, setIsFlipping] = useState(false);
	const [flipDirection, setFlipDirection] = useState<"forward" | "backward">(
		"forward",
	);
	const [contentKey, setContentKey] = useState(0);
	const [contentSwapped, setContentSwapped] = useState(false);
	const flipTimeout1 = useRef<ReturnType<typeof setTimeout> | null>(null);
	const flipTimeout2 = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Fetch memories from API
	const { data: memoriesData } = api.memory.list.useQuery(undefined, {
		// Refetch on window focus to get latest memories
		refetchOnWindowFocus: true,
	});

	// Convert API memories to diary entries, fallback to static data
	const entries = useMemo(() => {
		if (memoriesData?.memories && memoriesData.memories.length > 0) {
			return memoriesToDiaryEntries(memoriesData.memories);
		}
		return diaryEntries;
	}, [memoriesData]);

	const entryMap = getEntryMap(selectedYear, selectedMonth, entries);
	const weeks = getCalendarGrid(selectedYear, selectedMonth);

	const holeCenters = useMemo(() => computeHoleCenters(), []);
	const leftPageMask = useMemo(
		() => buildHoleMask(PAGE_WIDTH, PAGE_HEIGHT_NUM, "right", holeCenters),
		[holeCenters],
	);
	const rightPageMask = useMemo(
		() => buildHoleMask(PAGE_WIDTH, PAGE_HEIGHT_NUM, "left", holeCenters),
		[holeCenters],
	);

	useEffect(() => {
		return () => {
			if (flipTimeout1.current) clearTimeout(flipTimeout1.current);
			if (flipTimeout2.current) clearTimeout(flipTimeout2.current);
		};
	}, []);

	const changeMonth = useCallback(
		(newMonth: number, newYear: number, direction: "forward" | "backward") => {
			if (isFlipping) return;
			setSelectedEntry(null);
			setFlipDirection(direction);
			setIsFlipping(true);
			setContentSwapped(false);

			if (direction === "backward") {
				setSelectedMonth(newMonth);
				setSelectedYear(newYear);
				setContentKey((k) => k + 1);
				setContentSwapped(true);

				flipTimeout1.current = setTimeout(() => {
					setIsFlipping(false);
					setContentSwapped(false);
				}, 680);
			} else {
				flipTimeout1.current = setTimeout(() => {
					setSelectedMonth(newMonth);
					setSelectedYear(newYear);
					setContentKey((k) => k + 1);
					setContentSwapped(true);
					setIsFlipping(false);
				}, 680);

				flipTimeout2.current = setTimeout(() => {
					setContentSwapped(false);
				}, 720);
			}
		},
		[isFlipping],
	);

	const prevMonth = () => {
		const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
		const newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
		changeMonth(newMonth, newYear, "backward");
	};

	const nextMonth = () => {
		const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
		const newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
		changeMonth(newMonth, newYear, "forward");
	};

	const handleMonthTab = (index: number) => {
		if (index === selectedMonth || isFlipping) return;
		const direction = index > selectedMonth ? "forward" : "backward";
		changeMonth(index, selectedYear, direction);
	};

	const visibleMonths = months.slice(0, 12);

	// Masks for flip overlay faces
	const flipFrontLeftMask = useMemo(
		() => buildHoleMask(PAGE_WIDTH, PAGE_HEIGHT_NUM, "left", holeCenters),
		[holeCenters],
	);
	const flipFrontRightMask = useMemo(
		() => buildHoleMask(PAGE_WIDTH, PAGE_HEIGHT_NUM, "right", holeCenters),
		[holeCenters],
	);

	return (
		<div className="diary-bg relative flex min-h-screen items-center justify-center p-4 font-patrick sm:p-8">
			{/* ── Persona Toggle (top-right) ── */}
			<div className="absolute top-4 right-4 z-50">
				<PersonaToggle />
			</div>

			<div
				className="book-container flex items-stretch"
				style={{ perspective: "1200px" }}
			>
				{/* ── Month Tabs ── */}
				<div className="flex flex-col justify-center gap-0.5">
					{visibleMonths.map((month, index) => (
						<button
							key={month}
							type="button"
							onClick={() => handleMonthTab(index)}
							className={`month-tab -mr-px relative rounded-l-lg border border-r-0 px-3 py-2 text-lg font-semibold sm:px-4 sm:text-xl ${selectedMonth === index
								? "month-tab-active z-20 border-[#c4b8d6] bg-[#f5f0ea] text-[#5a4a7a]"
								: "month-tab-inactive border-[#b8acd0] bg-[#b8aad2] text-[#ece6f4] hover:bg-[#c8bce0] hover:text-white"
								}`}
						>
							{month.slice(0, 3)}
						</button>
					))}
				</div>

				{/* ── Book wrapper ── */}
				<div className="relative">
					{/* Stacked page edges underneath */}
					{Array.from({ length: PAGE_EDGE_COUNT }).map((_, i) => (
						<div
							key={`edge-${i}`}
							className="pointer-events-none absolute"
							style={{
								top: 3 + i * 2,
								left: -(PAGE_EDGE_COUNT - i) * 1.5,
								width:
									PAGE_WIDTH * 2 +
									SPIRAL_WIDTH +
									(PAGE_EDGE_COUNT - i) * 3,
								height: PAGE_HEIGHT,
								borderRadius: "16px",
								background: `linear-gradient(180deg, ${i % 2 === 0 ? "#ede8e0" : "#eae4dc"
									} 0%, ${i % 2 === 0 ? "#e8e2d8" : "#e5dfd5"} 100%)`,
								zIndex: i,
								boxShadow:
									i === 0
										? "0 4px 12px rgba(60,40,80,0.08), 0 2px 4px rgba(60,40,80,0.06)"
										: "none",
							}}
						/>
					))}

					{/* Main book pages */}
					<div
						className="relative flex items-stretch"
						style={{ zIndex: PAGE_EDGE_COUNT + 1 }}
					>
						{/* Left Page: Mini Calendar */}
						<div
							className="page-left paper-texture relative z-20 flex flex-col rounded-l-2xl border border-r-0 border-[#c4b8d6] p-8 sm:p-10"
							style={{
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
								WebkitMaskImage: leftPageMask,
								maskImage: leftPageMask,
								WebkitMaskSize: "100% 100%",
								maskSize: "100% 100%",
							}}
						>
							<div
								key={`cal-${contentKey}`}
								className="relative z-10 flex flex-1 flex-col"
							>
								{/* Month Navigation */}
								<div className="mb-5 flex items-center justify-between">
									<button
										type="button"
										onClick={prevMonth}
										className="rounded-lg px-3 py-1.5 text-2xl text-[#8a7ea0] transition-colors hover:bg-[#e8e0f2] hover:text-[#5a4a7a]"
									>
										&#8249;
									</button>
									<h2 className="font-semibold text-[#4a3a6a] text-2xl sm:text-3xl">
										{months[selectedMonth]} {selectedYear}
									</h2>
									<button
										type="button"
										onClick={nextMonth}
										className="rounded-lg px-3 py-1.5 text-2xl text-[#8a7ea0] transition-colors hover:bg-[#e8e0f2] hover:text-[#5a4a7a]"
									>
										&#8250;
									</button>
								</div>

								{/* Weekday Headers */}
								<div className="mb-2 grid grid-cols-7 gap-1.5">
									{weekdays.map((day) => (
										<div
											key={day}
											className="py-1 text-center text-[#8a7ea0] text-lg font-semibold"
										>
											{day}
										</div>
									))}
								</div>

								{/* Calendar Grid */}
								<div className="grid flex-1 grid-cols-7 grid-rows-[repeat(auto-fill,1fr)] gap-1.5">
									{weeks.flat().map((day, i) => {
										if (day === null) {
											return <div key={`empty-${i}`} />;
										}
										const key = dateKey(
											selectedYear,
											selectedMonth,
											day,
										);
										const entry = entryMap.get(key);
										const hasEntry = !!entry;
										const isSelected =
											selectedEntry?.date === key;

										return (
											<button
												key={key}
												type="button"
												onClick={() => {
													if (entry)
														setSelectedEntry(entry);
												}}
												className={`calendar-cell group relative flex flex-col items-center justify-center rounded-lg border transition-all duration-200 ${isSelected
													? "border-[#9b8dba] bg-[#d8cfe8] shadow-md shadow-[#c4b8d6]/50"
													: hasEntry
														? "cursor-pointer border-[#d0c4e0] bg-[#ede6f5] hover:border-[#b0a4c4] hover:bg-[#ddd4eb] hover:shadow-md hover:shadow-[#c4b8d6]/30"
														: "cursor-default border-transparent"
													}`}
											>
												<span
													className={`text-xl sm:text-2xl ${isSelected
														? "font-bold text-[#3d2d5c]"
														: hasEntry
															? "font-semibold text-[#5a4a7a] group-hover:text-[#3d2d5c]"
															: "text-[#b0a4c4]"
														}`}
												>
													{day}
												</span>
												{hasEntry && (
													<span
														className={`mt-0.5 h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150 ${isSelected
															? "bg-[#5a4a7a]"
															: "bg-[#9b8dba]"
															}`}
													/>
												)}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Hole ring shadows (on top of the left page mask) */}
						<div
							className="pointer-events-none absolute left-0 top-0 z-30"
							style={{
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
							}}
						>
							<HoleRings side="right" centers={holeCenters} />
						</div>

						{/* Spiral / Spine Binding */}
						<div
							className="book-spine relative z-30 flex flex-col items-center justify-center gap-2 sm:gap-2.5"
							style={{ width: SPIRAL_WIDTH, height: PAGE_HEIGHT }}
						>
							{Array.from({ length: COIL_COUNT }).map((_, i) => (
								<div key={i} className="spiral-coil" />
							))}
						</div>

						{/* Hole ring shadows (on top of the right page mask) */}
						<div
							className="pointer-events-none absolute right-0 top-0 z-30"
							style={{
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
							}}
						>
							<HoleRings side="left" centers={holeCenters} />
						</div>

						{/* Right Page: Diary Entry */}
						<div
							className="page-right paper-texture relative z-20 flex flex-col rounded-r-2xl border border-l-0 border-[#c4b8d6] p-8 sm:p-10"
							style={{
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
								WebkitMaskImage: rightPageMask,
								maskImage: rightPageMask,
								WebkitMaskSize: "100% 100%",
								maskSize: "100% 100%",
							}}
						>
							<div
								key={`entry-${contentKey}`}
								className="relative z-10 flex min-h-0 flex-1 flex-col"
							>
								{selectedEntry ? (
									<>
										<h2 className="mb-4 shrink-0 border-b-2 border-[#d0c4e0] pb-3 font-semibold text-[#4a3a6a] text-2xl sm:text-3xl">
											{formatDateLong(
												selectedEntry.date,
											)}
										</h2>
										<div className="notebook-lines min-h-0 flex-1 overflow-y-auto pr-1">
											{selectedEntry.bullets.map(
												(bullet) => (
													<p
														key={bullet}
														className="flex items-end text-[#4a3d5e] text-xl sm:text-2xl"
														style={{
															minHeight: "36px",
														}}
													>
														<span className="mb-[8px] mr-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#b0a4c4]" />
														<span>{bullet}</span>
													</p>
												),
											)}
										</div>
									</>
								) : (
									<div className="notebook-lines flex flex-1 flex-col items-center justify-center">
										<p className="text-[#a89aba] text-xl italic sm:text-2xl">
											Pick a day to read...
										</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* ── Page Flip Overlays ── */}
					{isFlipping && flipDirection === "forward" && (
						<div
							className="pointer-events-none absolute z-40"
							style={{
								top: 0,
								right: 0,
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
								transformOrigin: "left center",
								transformStyle: "preserve-3d",
								animation:
									"flip-forward 0.65s ease-in-out forwards",
							}}
						>
							{/* Front face - holes on left (hinge/spine side) */}
							<div
								className="absolute inset-0 rounded-r-2xl"
								style={{
									backfaceVisibility: "hidden",
									background:
										"linear-gradient(135deg, #f5f0ea 0%, #efe8e0 50%, #f3ede5 100%)",
									boxShadow:
										"2px 0 20px rgba(0,0,0,0.15), inset -4px 0 12px rgba(60,40,80,0.05)",
									WebkitMaskImage: flipFrontLeftMask,
									maskImage: flipFrontLeftMask,
									WebkitMaskSize: "100% 100%",
									maskSize: "100% 100%",
								}}
							/>
							{/* Back face - holes on right (spine side when flipped) */}
							<div
								className="absolute inset-0 rounded-l-2xl"
								style={{
									backfaceVisibility: "hidden",
									transform: "rotateY(180deg)",
									background:
										"linear-gradient(225deg, #ede6de 0%, #f2ece4 50%, #eee7df 100%)",
									boxShadow:
										"-2px 0 20px rgba(0,0,0,0.12), inset 4px 0 12px rgba(60,40,80,0.05)",
									WebkitMaskImage: flipFrontRightMask,
									maskImage: flipFrontRightMask,
									WebkitMaskSize: "100% 100%",
									maskSize: "100% 100%",
								}}
							/>
						</div>
					)}

					{isFlipping && flipDirection === "backward" && (
						<div
							className="pointer-events-none absolute z-40"
							style={{
								top: 0,
								left: 0,
								width: PAGE_WIDTH,
								height: PAGE_HEIGHT,
								transformOrigin: "right center",
								transformStyle: "preserve-3d",
								animation:
									"flip-backward 0.65s ease-in-out forwards",
							}}
						>
							{/* Front face - holes on right (hinge/spine side) */}
							<div
								className="absolute inset-0 rounded-l-2xl"
								style={{
									backfaceVisibility: "hidden",
									background:
										"linear-gradient(225deg, #f5f0ea 0%, #efe8e0 50%, #f3ede5 100%)",
									boxShadow:
										"-2px 0 20px rgba(0,0,0,0.15), inset 4px 0 12px rgba(60,40,80,0.05)",
									WebkitMaskImage: flipFrontRightMask,
									maskImage: flipFrontRightMask,
									WebkitMaskSize: "100% 100%",
									maskSize: "100% 100%",
								}}
							/>
							{/* Back face - holes on left */}
							<div
								className="absolute inset-0 rounded-r-2xl"
								style={{
									backfaceVisibility: "hidden",
									transform: "rotateY(180deg)",
									background:
										"linear-gradient(135deg, #ede6de 0%, #f2ece4 50%, #eee7df 100%)",
									boxShadow:
										"2px 0 20px rgba(0,0,0,0.12), inset -4px 0 12px rgba(60,40,80,0.05)",
									WebkitMaskImage: flipFrontLeftMask,
									maskImage: flipFrontLeftMask,
									WebkitMaskSize: "100% 100%",
									maskSize: "100% 100%",
								}}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
