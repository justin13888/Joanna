"use client";

interface BookshelfProps {
	onSelectYear: (year: number) => void;
	selectedYear: number | null;
}

/* All books in lavender / off-white family */
const BOOK_COLORS = [
	{ bg: "from-[#c4b5e3] to-[#9b8abf]", text: "text-white/90" },       // medium lavender
	{ bg: "from-[#d8cfe8] to-[#b4a5d0]", text: "text-white/90" },       // light lavender
	{ bg: "from-[#b0a0cc] to-[#8878a8]", text: "text-white/90" },       // deeper lavender
	{ bg: "from-[#e0d8ec] to-[#c0b4d4]", text: "text-[#5a4a7a]" },     // pale lavender
	{ bg: "from-[#ccc0dc] to-[#a494c0]", text: "text-white/90" },       // dusty lavender
	{ bg: "from-[#d4c8e0] to-[#a898c0]", text: "text-[#5a4a7a]" },     // warm lavender
];

function getBookColor(year: number) {
	return BOOK_COLORS[year % BOOK_COLORS.length] ?? BOOK_COLORS[0];
}

function getBookHeight(year: number) {
	const offsets = [0, 8, -6, 14, 4, 10];
	return 220 + (offsets[year % offsets.length] ?? 0);
}

export function Bookshelf({ onSelectYear, selectedYear }: BookshelfProps) {
	const thisYear = new Date().getFullYear();
	const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

	return (
		<div className="w-full px-4">
			{/* Title */}
			<h1 className="mb-5 text-center font-handwriting text-2xl text-violet-400">
				Joanna&apos;s Bookshelf
			</h1>

			{/* Single row of books */}
			<div className="relative mx-auto max-w-3xl">
				<div
					className="flex items-end justify-center gap-4 px-4 pb-2 overflow-x-auto"
					style={{ minHeight: 260 }}
				>
					{years.map((year) => {
						const color = getBookColor(year);
						const height = getBookHeight(year);
						const isPulled = year === selectedYear;

						return (
							<button
								key={year}
								onClick={() => onSelectYear(year)}
								className="group relative flex-shrink-0"
								style={{
									width: 80,
									height,
									transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
								}}
								type="button"
							>
								{/* Book body */}
								<div
									className={`relative h-full w-full rounded-r-[3px] rounded-l-[4px] bg-gradient-to-r ${color.bg} transition-all duration-500 group-hover:shadow-xl`}
									style={{
										boxShadow: "2px 4px 10px rgb(0 0 0 / 0.15)",
										opacity: isPulled ? 0 : 1,
										transform: isPulled ? "translateZ(40px) rotateY(-12deg)" : "none",
									}}
								>
									{/* Spine edge */}
									<div className="absolute inset-y-0 left-0 w-[6px] rounded-l-[4px] bg-black/10" />
									<div className="absolute inset-y-0 left-[6px] w-[2px] bg-white/20" />

									{/* Top & bottom */}
									<div className="absolute top-0 inset-x-0 h-px bg-white/30" />
									<div className="absolute bottom-0 inset-x-0 h-px bg-black/10" />

									{/* Year on spine */}
									<div className="absolute inset-0 flex items-center justify-center">
										<span
											className={`${color.text} font-bold tracking-widest drop-shadow-sm`}
											style={{
												writingMode: "vertical-rl",
												textOrientation: "mixed",
												fontSize: "0.95rem",
											}}
										>
											{year}
										</span>
									</div>

									{/* Decorative bands */}
									<div className="absolute top-3 inset-x-2 h-[2px] bg-white/20 rounded-full" />
									<div className="absolute bottom-3 inset-x-2 h-[2px] bg-white/20 rounded-full" />

									{/* Pages edge */}
									<div
										className="absolute inset-y-1 right-0 w-[3px] rounded-r-[2px]"
										style={{
											background: "repeating-linear-gradient(to bottom, #f5f0ea 0px, #f5f0ea 2px, #e8e2d8 2px, #e8e2d8 3px)",
										}}
									/>
								</div>

								{/* Empty gap shadow */}
								{isPulled && (
									<div
										className="absolute inset-0 rounded-[3px]"
										style={{
											background: "linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.06))",
											boxShadow: "inset 0 2px 6px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(0,0,0,0.04)",
										}}
									/>
								)}
							</button>
						);
					})}
				</div>

				{/* Shelf plank */}
				<div
					className="rounded-sm bg-gradient-to-b from-violet-200 to-violet-300/80"
					style={{
						height: 14,
						boxShadow: "0 4px 10px rgb(139 92 246 / 0.15), inset 0 1px 0 rgb(255 255 255 / 0.5)",
					}}
				/>
				<div className="mx-8 h-2 rounded-b-sm bg-gradient-to-b from-violet-300/30 to-transparent" />
			</div>
		</div>
	);
}
