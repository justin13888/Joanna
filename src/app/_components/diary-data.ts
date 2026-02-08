export type DiaryEntry = {
	date: string; // ISO date string (YYYY-MM-DD)
	bullets: string[];
};

/**
 * Transform API memories into DiaryEntry format.
 * Groups memories by date and combines their content into bullets.
 */
export function memoriesToDiaryEntries(
	memories: { content: string; createdAt: Date }[],
): DiaryEntry[] {
	// Group memories by date
	const byDate = new Map<string, string[]>();

	for (const memory of memories) {
		const date = memory.createdAt.toISOString().split("T")[0]!;
		const existing = byDate.get(date) ?? [];
		existing.push(memory.content);
		byDate.set(date, existing);
	}

	// Convert to DiaryEntry array
	const entries: DiaryEntry[] = [];
	for (const [date, bullets] of byDate.entries()) {
		entries.push({ date, bullets });
	}

	// Sort by date descending (newest first)
	entries.sort((a, b) => b.date.localeCompare(a.date));

	return entries;
}

export const diaryEntries: DiaryEntry[] = [
	// January 2026
	{
		date: "2026-01-02",
		bullets: [
			"Started the new year feeling refreshed after a quiet New Year's Eve at home",
			"Set three main goals for 2026: read more, exercise consistently, learn piano",
			"Went grocery shopping and meal-prepped for the week",
		],
	},
	{
		date: "2026-01-05",
		bullets: [
			"First Monday back at work — caught up on emails and planned the week",
			"Had a great lunch with Sarah, talked about her trip to Japan",
			"Started reading 'Klara and the Sun' before bed",
		],
	},
	{
		date: "2026-01-08",
		bullets: [
			"Signed up for a beginner piano class starting next week",
			"Went for a 3-mile run in the park, felt amazing afterward",
			"Cooked a new pasta recipe — roasted tomato and ricotta",
			"Called Mom, she's planning to visit in March",
		],
	},
	{
		date: "2026-01-12",
		bullets: [
			"First piano lesson! Learned basic hand positioning and a simple scale",
			"Work was stressful — big deadline moved up by a week",
			"Watched a documentary about deep sea creatures to unwind",
		],
	},
	{
		date: "2026-01-15",
		bullets: [
			"Finally finished the project proposal at work, feels like a weight lifted",
			"Ran into Alex at the coffee shop, haven't seen them in months",
			"Finished 'Klara and the Sun' — really moving ending",
		],
	},
	{
		date: "2026-01-19",
		bullets: [
			"Lazy Sunday — stayed in pajamas until noon and it was perfect",
			"Practiced piano for 30 minutes, starting to get the hang of C major",
			"Made homemade soup and watched the rain all afternoon",
			"Journaled about what I want this year to look like",
		],
	},
	{
		date: "2026-01-22",
		bullets: [
			"Team meeting went well, got positive feedback on the proposal",
			"Tried a new yoga class at the gym — surprisingly challenging",
			"Started reading 'Project Hail Mary'",
		],
	},
	{
		date: "2026-01-26",
		bullets: [
			"Weekend hike at the nature reserve, saw a deer up close",
			"Piano practice — learned my first simple song (Ode to Joy)",
			"Had friends over for board game night, played Catan and Codenames",
			"Feeling really good about the rhythm I'm building this month",
		],
	},
	{
		date: "2026-01-30",
		bullets: [
			"End of January already — time is flying",
			"Work review went great, manager mentioned a possible promotion",
			"Ran my longest distance yet — 4.5 miles without stopping",
		],
	},

	// February 2026
	{
		date: "2026-02-01",
		bullets: [
			"February feels fresh — reorganized my desk and workspace",
			"Started planning a small trip for Valentine's weekend",
			"Piano class learned left-hand accompaniment patterns",
		],
	},
	{
		date: "2026-02-03",
		bullets: [
			"Busy day at work but managed to stay focused with the Pomodoro technique",
			"Grabbed dinner with Jordan — they're thinking of switching careers",
			"Read three chapters of 'Project Hail Mary', can't put it down",
		],
	},
	{
		date: "2026-02-05",
		bullets: [
			"Woke up early and went for a sunrise run, absolutely beautiful",
			"Got the promotion! Officially a senior developer now",
			"Celebrated with takeout sushi and a movie at home",
			"Called Mom and Dad to share the news, they were so happy",
			"Feeling grateful for how this year is starting",
			"Went to the bookstore and picked up two new novels",
			"Made a playlist of songs that match my mood today",
			"Wrote a long thank-you email to my mentor at work",
			"Cooked a fancy dinner to celebrate — mushroom risotto from scratch",
			"FaceTimed with my sister, she's so proud of me",
			"Stayed up way too late journaling about everything",
			"Realized I need to update my LinkedIn with the new title",
		],
	},
	{
		date: "2026-02-06",
		bullets: [
			"First day in the new role, met with my expanded team",
			"Onboarding docs are overwhelming but manageable",
			"Piano practice — working on a simplified version of Clair de Lune",
			"Made a vision board for the rest of the year",
		],
	},
	{
		date: "2026-02-07",
		bullets: [
			"Started setting up this digital diary — excited to track my days",
			"Had a productive brainstorming session at work",
			"Tried a new coffee shop downtown, great oat milk latte",
		],
	},
];

export const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

/**
 * Parse a YYYY-MM-DD string without timezone shift
 */
export function parseDate(dateStr: string): { year: number; month: number; day: number } {
	const [year, month, day] = dateStr.split("-").map(Number);
	return { year: year!, month: month! - 1, day: day! };
}

/**
 * Build a date key like "2026-02-06"
 */
export function dateKey(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get a map of date key -> entry for a given month
 * @param entries Optional entries to use instead of static diaryEntries
 */
export function getEntryMap(
	year: number,
	month: number,
	entries: DiaryEntry[] = diaryEntries,
): Map<string, DiaryEntry> {
	const map = new Map<string, DiaryEntry>();
	for (const entry of entries) {
		const d = parseDate(entry.date);
		if (d.year === year && d.month === month) {
			map.set(entry.date, entry);
		}
	}
	return map;
}

/**
 * Get calendar grid data for a month.
 * Returns weeks (rows), each containing 7 day slots (null for empty cells).
 */
export function getCalendarGrid(
	year: number,
	month: number,
): (number | null)[][] {
	const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	const weeks: (number | null)[][] = [];
	let currentWeek: (number | null)[] = [];

	// Leading empty cells
	for (let i = 0; i < firstDay; i++) {
		currentWeek.push(null);
	}

	for (let day = 1; day <= daysInMonth; day++) {
		currentWeek.push(day);
		if (currentWeek.length === 7) {
			weeks.push(currentWeek);
			currentWeek = [];
		}
	}

	// Trailing empty cells
	if (currentWeek.length > 0) {
		while (currentWeek.length < 7) {
			currentWeek.push(null);
		}
		weeks.push(currentWeek);
	}

	return weeks;
}

/**
 * Format a date string like "February 6th, 2026"
 */
export function formatDateLong(dateStr: string): string {
	const { year, month, day } = parseDate(dateStr);
	const suffix = getDaySuffix(day);
	return `${months[month]} ${day}${suffix}, ${year}`;
}

/**
 * Format a date string like "Feb 6th"
 */
export function formatDateDisplay(dateStr: string): string {
	const { month, day } = parseDate(dateStr);
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const suffix = getDaySuffix(day);
	return `${monthNames[month]} ${day}${suffix}`;
}

function getDaySuffix(day: number): string {
	if (day >= 11 && day <= 13) return "th";
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
