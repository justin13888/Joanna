export interface Entry {
	id: number;
	title: string;
	content: string;
	mood: string | null;
	createdAt: Date;
}

export const MOODS = [
	{ value: "happy", label: "Happy", emoji: "\u{1F60A}" },
	{ value: "grateful", label: "Grateful", emoji: "\u{1F64F}" },
	{ value: "calm", label: "Calm", emoji: "\u{1F60C}" },
	{ value: "reflective", label: "Reflective", emoji: "\u{1F4AD}" },
	{ value: "excited", label: "Excited", emoji: "\u2728" },
	{ value: "anxious", label: "Anxious", emoji: "\u{1F630}" },
	{ value: "sad", label: "Sad", emoji: "\u{1F622}" },
	{ value: "frustrated", label: "Frustrated", emoji: "\u{1F624}" },
] as const;

export const MOOD_EMOJI: Record<string, string> = Object.fromEntries(
	MOODS.map((m) => [m.value, m.emoji]),
);

export const DUMMY_ENTRIES: Entry[] = [
	{
		id: 1,
		title: "Crushed my morning workout",
		content:
			"Woke up early and hit the gym at 6am. Set a new personal record on deadlifts \u2014 315lbs! The consistency over the past few weeks is really showing. Feeling strong and energized for the rest of the day.",
		mood: "excited",
		createdAt: new Date("2026-02-06T06:30:00"),
	},
	{
		id: 2,
		title: "Project presentation went well",
		content:
			"Finally presented the Q1 roadmap to the leadership team. Was nervous at first but once I got going, the confidence kicked in. Got great feedback and even got a shoutout from the VP. All those late nights preparing were worth it.",
		mood: "happy",
		createdAt: new Date("2026-02-05T16:45:00"),
	},
	{
		id: 3,
		title: "Feeling a bit overwhelmed",
		content:
			"So many things on my plate right now. Work deadlines, trying to maintain the gym routine, and haven\u2019t called mom in a while. Need to prioritize and maybe say no to some things. It\u2019s okay to not do everything at once.",
		mood: "anxious",
		createdAt: new Date("2026-02-04T22:10:00"),
	},
	{
		id: 4,
		title: "Great conversation with an old friend",
		content:
			"Had coffee with Alex today after months of not seeing each other. We talked about everything \u2014 careers, relationships, dreams. Reminded me how important it is to nurture friendships. Made plans to meet up weekly.",
		mood: "grateful",
		createdAt: new Date("2026-02-03T14:20:00"),
	},
	{
		id: 5,
		title: "Started reading Atomic Habits",
		content:
			"Picked up \u2018Atomic Habits\u2019 by James Clear. Only two chapters in but already finding it insightful. The idea of 1% improvement daily really resonates with me. Going to try implementing some of the strategies.",
		mood: "calm",
		createdAt: new Date("2026-02-02T20:00:00"),
	},
	{
		id: 6,
		title: "Need to rethink my approach",
		content:
			"The side project I\u2019ve been working on isn\u2019t progressing as fast as I hoped. Maybe I\u2019m overcomplicating things. Going to take a step back this weekend and re-evaluate the architecture. Sometimes simplicity wins.",
		mood: "reflective",
		createdAt: new Date("2026-02-01T19:30:00"),
	},
];

export const DUMMY_SUMMARY = {
	greeting: "Good evening",
	encouragement:
		"You\u2019ve had an incredible week! From crushing your workout PR to nailing that project presentation, you\u2019ve shown that consistency and preparation pay off. Remember when you felt overwhelmed on Tuesday? You pushed through it and came out stronger. That resilience is your superpower \u2014 trust yourself more, you\u2019ve earned it.",
	achievements: [
		"New deadlift personal record \u2014 315lbs",
		"Successful Q1 roadmap presentation",
		"6-day journaling streak",
		"Reconnected with an old friend",
	],
	focusAreas: [
		"Take breaks during intense work days",
		"Call mom this weekend",
		"Simplify the side project architecture",
		"Continue the morning gym routine",
	],
};

export const CONTEXT_PROMPTS = [
	"I remember you had that big presentation today.",
	"You mentioned wanting to journal more consistently.",
	"Last time we talked, you were feeling excited about your project.",
	"You\u2019ve been on a great streak lately \u2014 6 days in a row!",
];
