"use client";

import { VoiceScreen } from "./voice-screen";

export function AppShell() {
	return (
		<div className="relative mx-auto flex h-dvh max-h-[932px] w-full max-w-[430px] flex-col overflow-hidden rounded-[3rem] border-[6px] border-neutral-700 bg-[#faf7f2] shadow-2xl shadow-black/40">
			{/* ── Dynamic Island ── */}
			<div className="pointer-events-none absolute top-0 right-0 left-0 z-50 flex justify-center pt-3">
				<div className="h-[34px] w-[126px] rounded-full bg-black shadow-[0_0_0_2px_rgb(0_0_0)]" />
			</div>

			{/* ── App content ── */}
			<VoiceScreen />

			{/* ── Home indicator bar ── */}
			<div className="pointer-events-none absolute right-0 bottom-0 left-0 z-50 flex justify-center pb-2">
				<div className="h-[5px] w-[134px] rounded-full bg-black/20" />
			</div>
		</div>
	);
}
