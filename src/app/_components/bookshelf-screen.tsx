"use client";

interface BookshelfProps {
	onSelectYear: (year: number) => void;
	selectedYear: number | null;
}

/* Lighter wood palette */
const WOOD_SHELF = {
	base: "linear-gradient(to bottom, #b8956a, #a08050)",
	shadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
};

/* Diary year books - lavender palette */
const YEAR_BOOK_COLORS = [
	{ bg: "from-[#c4b5e3] to-[#9b8abf]", text: "text-white/90" },
	{ bg: "from-[#d8cfe8] to-[#b4a5d0]", text: "text-[#5a4a7a]" },
	{ bg: "from-[#b0a0cc] to-[#8878a8]", text: "text-white/90" },
	{ bg: "from-[#e0d8ec] to-[#c0b4d4]", text: "text-[#5a4a7a]" },
	{ bg: "from-[#ccc0dc] to-[#a494c0]", text: "text-white/90" },
	{ bg: "from-[#d4c8e0] to-[#a898c0]", text: "text-[#5a4a7a]" },
];

/* Decorative/blank books - varied muted colors */
const DECOR_BOOK_COLORS = [
	"from-amber-200 to-amber-400",
	"from-stone-200 to-stone-400",
	"from-rose-200 to-rose-300",
	"from-sky-200 to-sky-300",
	"from-emerald-200 to-emerald-300",
	"from-violet-200 to-violet-300",
	"from-orange-100 to-orange-200",
	"from-teal-200 to-teal-300",
	"from-slate-200 to-slate-400",
	"from-fuchsia-100 to-fuchsia-200",
];

function getYearBookColor(year: number) {
	return YEAR_BOOK_COLORS[year % YEAR_BOOK_COLORS.length] ?? YEAR_BOOK_COLORS[0]!;
}

function getYearBookHeight(year: number) {
	const offsets = [0, 8, -6, 14, 4, 10];
	return 200 + (offsets[year % offsets.length] ?? 0);
}

function getDecorBookHeight(index: number) {
	const heights = [160, 180, 220, 190, 170, 210, 195, 175, 205, 185];
	return heights[index % heights.length] ?? 180;
}

function getDecorBookWidth(index: number) {
	const widths = [60, 75, 65, 85, 70, 80, 72, 90, 68, 78];
	return widths[index % widths.length] ?? 70;
}

/* Single shelf plank with light wood */
function ShelfPlank() {
	return (
		<div
			className="relative rounded-sm overflow-hidden"
			style={{
				height: 22,
				background: WOOD_SHELF.base,
				boxShadow: WOOD_SHELF.shadow,
			}}
		>
			<div
				className="absolute inset-0 opacity-30"
				style={{
					backgroundImage:
						"repeating-linear-gradient(90deg, transparent 0px, transparent 60px, rgba(0,0,0,0.03) 60px, rgba(0,0,0,0.03) 61px)",
				}}
			/>
			<div
				className="absolute inset-0 opacity-20"
				style={{
					backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 50%)",
				}}
			/>
			<div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-sm bg-black/15" />
		</div>
	);
}

/* Decorative book (no year, not clickable) */
function DecorBook({
	index,
	colorClass,
}: {
	index: number;
	colorClass: string;
}) {
	const height = getDecorBookHeight(index);
	const width = getDecorBookWidth(index);
	return (
		<div
			className="flex-shrink-0"
			style={{
				width,
				height,
				perspective: "500px",
			}}
		>
			<div className={`relative h-full w-full rounded-r-[2px] rounded-l-[5px] bg-gradient-to-r shadow-md transition-shadow hover:shadow-xl ${colorClass}`}>
				{/* Rounded Spine highlight */}
				<div className="absolute inset-y-0 left-0 w-[12px] rounded-l-[5px] bg-gradient-to-r from-black/20 via-white/10 to-transparent" />

				{/* Stitching / Banding */}
				<div className="absolute inset-y-0 left-[2px] w-[2px] opacity-20"
					style={{ backgroundImage: "repeating-linear-gradient(to bottom, #fff 0px, #fff 2px, transparent 2px, transparent 4px)" }} />
				<div className="absolute inset-y-0 left-[8px] w-px bg-white/20" />

				{/* Top & Bottom bands */}
				<div className="absolute top-2 inset-x-3 h-px bg-white/30" />
				<div className="absolute bottom-2 inset-x-3 h-px bg-white/30" />

				<div className="absolute top-0 inset-x-0 h-px bg-white/20" />
				<div className="absolute bottom-0 inset-x-0 h-px bg-black/10" />
			</div>
		</div>
	);
}

/* Year book (clickable diary) */
function YearBook({
	year,
	onSelect,
	isPulled,
}: {
	year: number;
	onSelect: () => void;
	isPulled: boolean;
}) {
	const color = getYearBookColor(year);
	const height = getYearBookHeight(year);
	return (
		<button
			onClick={onSelect}
			className="group relative flex-shrink-0"
			style={{
				width: 72,
				height,
				transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
				perspective: "500px",
			}}
			type="button"
		>
			<div
				className={`relative h-full w-full rounded-r-[3px] rounded-l-[5px] bg-gradient-to-r ${color.bg} transition-all duration-500 group-hover:shadow-xl`}
				style={{
					boxShadow: "2px 4px 10px rgb(0 0 0 / 0.15)",
					opacity: isPulled ? 0 : 1,
					transform: isPulled ? "translateZ(40px) rotateY(-8deg)" : "none",
				}}
			>
				{/* Rounded Spine highlight */}
				<div className="absolute inset-y-0 left-0 w-[14px] rounded-l-[5px] bg-gradient-to-r from-black/20 via-white/15 to-transparent shadow-inner" />

				{/* Stitching Line */}
				<div className="absolute inset-y-0 left-[3px] w-[2px] opacity-30"
					style={{ backgroundImage: "repeating-linear-gradient(to bottom, #fff 0px, #fff 3px, transparent 3px, transparent 6px)" }} />

				{/* Hinge Line */}
				<div className="absolute inset-y-0 left-[11px] w-[1px] bg-black/10" />
				<div className="absolute inset-y-0 left-[12px] w-[1px] bg-white/20" />

				<div className="absolute inset-0 flex items-center justify-center">
					<span
						className={`${color.text} font-bold tracking-widest drop-shadow-sm`}
						style={{
							writingMode: "vertical-rl",
							textOrientation: "mixed",
							fontSize: "0.95rem",
							opacity: 0.85
						}}
					>
						{year}
					</span>
				</div>

				{/* Decorative bands at top/bottom of spine */}
				<div className="absolute top-4 left-1 right-1 h-[2px] bg-white/20 rounded-full" />
				<div className="absolute bottom-4 left-1 right-1 h-[2px] bg-white/20 rounded-full" />
			</div>
			{isPulled && (
				<div
					className="absolute inset-0 rounded-[3px]"
					style={{
						background:
							"linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.06))",
						boxShadow:
							"inset 0 2px 6px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(0,0,0,0.04)",
					}}
				/>
			)}
		</button>
	);
}

/* How many decorative books to show per side on top/bottom rows */
const DECOR_COUNT_TOP = 15;
const DECOR_COUNT_BOTTOM = 18;

export function Bookshelf({ onSelectYear, selectedYear }: BookshelfProps) {
	const thisYear = new Date().getFullYear();
	const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

	return (
		<div
			className="relative flex min-h-full w-full flex-col overflow-hidden"
			style={{
				backgroundImage: "url('/wood-texture.svg')",
				backgroundRepeat: "repeat",
				backgroundSize: "320px 320px",
				backgroundColor: "#96642c",
			}}
		>
			{/* Subtle gradient overlay for depth and natural lighting */}
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"linear-gradient(180deg, rgba(0,0,0,0.12) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.18) 100%)",
				}}
			/>
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.08) 100%)",
				}}
			/>

			{/* Left and right “walls” of the bookshelf for depth */}
			<div
				className="absolute top-0 bottom-0 left-0 w-8"
				style={{
					background: "linear-gradient(to right, #6b5344, #8b7355)",
					boxShadow: "inset -4px 0 12px rgba(0,0,0,0.2)",
				}}
			/>
			<div
				className="absolute top-0 bottom-0 right-0 w-8"
				style={{
					background: "linear-gradient(to left, #6b5344, #8b7355)",
					boxShadow: "inset 4px 0 12px rgba(0,0,0,0.2)",
				}}
			/>

			<div className="relative z-10 flex flex-1 flex-col justify-center gap-0 px-2 py-4">
				{/* ─── TOP SHELF (decorative books only) ─── */}
				<div className="flex items-end justify-center gap-2 px-2 overflow-x-auto scrollbar-hide" style={{ minHeight: 240 }}>
					{Array.from({ length: DECOR_COUNT_TOP }, (_, i) => (
						<DecorBook
							key={`top-${i}`}
							index={i}
							colorClass={DECOR_BOOK_COLORS[i % DECOR_BOOK_COLORS.length]!}
						/>
					))}
				</div>
				<ShelfPlank />

				{/* ─── MIDDLE SHELF (year diaries - clickable) ─── */}
				<div
					className="flex items-end justify-center gap-3 px-2 overflow-x-auto scrollbar-hide"
					style={{ minHeight: 240 }}
				>
					{years.map((year) => (
						<YearBook
							key={year}
							year={year}
							onSelect={() => onSelectYear(year)}
							isPulled={year === selectedYear}
						/>
					))}
				</div>
				<ShelfPlank />

				{/* ─── BOTTOM SHELF (decorative books only) ─── */}
				<div className="flex items-end justify-center gap-2 px-2 overflow-x-auto scrollbar-hide" style={{ minHeight: 240 }}>
					{Array.from({ length: DECOR_COUNT_BOTTOM }, (_, i) => (
						<DecorBook
							key={`bottom-${i}`}
							index={i + 10}
							colorClass={DECOR_BOOK_COLORS[(i + 3) % DECOR_BOOK_COLORS.length]!}
						/>
					))}
				</div>
				<ShelfPlank />
			</div>

			{/* Bottom shadow under last shelf */}
			<div
				className="h-6 w-full"
				style={{
					background: "linear-gradient(to bottom, rgba(0,0,0,0.25), transparent)",
				}}
			/>
		</div>
	);
}
