"use client";

interface OrbProps {
	isActive?: boolean;
	size?: number;
	/** 0–1 mic volume for reactive scaling + glow */
	volume?: number;
}

export function Orb({ isActive = false, size = 160, volume = 0 }: OrbProps) {
	const speed = isActive ? 1 : 2.5;
	const scale = 1 + volume * 0.3;
	const v = volume;
	const gi = isActive ? 0.5 + v * 0.5 : 0.35;

	/** Multi-layer glow shadow for each strand */
	const glow = (base: number) => {
		const o = base * gi;
		return [
			`0 0 ${6 + v * 12}px 2px rgb(196 181 253 / ${f(o * 0.9)})`,
			`0 0 ${18 + v * 16}px 4px rgb(167 139 250 / ${f(o * 0.45)})`,
			`0 0 ${38 + v * 22}px 8px rgb(139 92 246 / ${f(o * 0.18)})`,
		].join(", ");
	};

	return (
		<div
			className="relative"
			style={{
				width: size,
				height: size,
				transform: `scale(${scale})`,
				transition: "transform 0.12s ease-out",
			}}
		>
			{/* ── Ambient glow ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: -size * 0.28,
					background: `radial-gradient(circle, rgb(167 139 250 / ${f(gi * 0.22)}), transparent 58%)`,
					filter: `blur(${size * 0.16}px)`,
				}}
			/>

			{/* ── Strand 1 — thick bright, CW ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "2%",
					borderRadius: "40% 60% 58% 42% / 55% 45% 55% 45%",
					border: `${size * 0.022}px solid transparent`,
					borderTopColor: "rgb(237 233 254 / 0.95)",
					borderRightColor: "rgb(196 181 253 / 0.45)",
					filter: "blur(1px)",
					boxShadow: glow(0.9),
					animation: `orb-spin ${5 / speed}s ease-in-out infinite`,
				}}
			/>

			{/* ── Strand 2 — thick bright, CCW ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "5%",
					borderRadius: "58% 42% 45% 55% / 42% 58% 42% 58%",
					border: `${size * 0.025}px solid transparent`,
					borderBottomColor: "rgb(237 233 254 / 0.92)",
					borderLeftColor: "rgb(196 181 253 / 0.4)",
					filter: "blur(1px)",
					boxShadow: glow(0.85),
					animation: `orb-spin-reverse ${6.2 / speed}s ease-in-out infinite`,
				}}
			/>

			{/* ── Strand 3 — medium, CW, wide path ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "0%",
					borderRadius: "50% 50% 44% 56% / 60% 40% 60% 40%",
					border: `${size * 0.018}px solid transparent`,
					borderTopColor: "rgb(196 181 253 / 0.82)",
					borderLeftColor: "rgb(167 139 250 / 0.35)",
					filter: "blur(1.5px)",
					boxShadow: glow(0.65),
					animation: `orb-spin ${7.5 / speed}s linear infinite`,
				}}
			/>

			{/* ── Strand 4 — medium, fast CCW ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "7%",
					borderRadius: "55% 45% 52% 48% / 48% 52% 48% 52%",
					border: `${size * 0.016}px solid transparent`,
					borderRightColor: "rgb(232 224 250 / 0.88)",
					borderBottomColor: "rgb(167 139 250 / 0.3)",
					filter: "blur(1.5px)",
					boxShadow: glow(0.6),
					animation: `orb-spin-reverse ${4.8 / speed}s ease-in-out infinite`,
				}}
			/>

			{/* ── Strand 5 — tight inner accent, CW ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "10%",
					borderRadius: "48% 52% 56% 44% / 52% 48% 52% 48%",
					border: `${size * 0.019}px solid transparent`,
					borderTopColor: "rgb(237 233 254 / 0.85)",
					borderRightColor: "rgb(196 181 253 / 0.25)",
					filter: "blur(0.5px)",
					boxShadow: glow(0.55),
					animation: `orb-spin ${3.8 / speed}s ease-in-out infinite`,
				}}
			/>

			{/* ── Strand 6 — large outer wisp, slow ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "-3%",
					borderRadius: "46% 54% 50% 50% / 56% 44% 56% 44%",
					border: `${size * 0.012}px solid transparent`,
					borderBottomColor: "rgb(196 181 253 / 0.55)",
					borderRightColor: "rgb(167 139 250 / 0.2)",
					filter: "blur(2.5px)",
					boxShadow: glow(0.35),
					animation: `orb-spin ${9 / speed}s linear infinite`,
				}}
			/>

			{/* ── Strand 7 — medium, different orbit ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "4%",
					borderRadius: "52% 48% 42% 58% / 44% 56% 44% 56%",
					border: `${size * 0.015}px solid transparent`,
					borderLeftColor: "rgb(232 224 250 / 0.78)",
					borderTopColor: "rgb(167 139 250 / 0.3)",
					filter: "blur(1px)",
					boxShadow: glow(0.55),
					animation: `orb-spin ${5.8 / speed}s ease-in-out infinite`,
				}}
			/>

			{/* ── Strand 8 — thin fast accent ── */}
			<div
				className="absolute rounded-full"
				style={{
					inset: "8%",
					borderRadius: "44% 56% 50% 50% / 56% 44% 56% 44%",
					border: `${size * 0.011}px solid transparent`,
					borderBottomColor: "rgb(237 233 254 / 0.72)",
					filter: "blur(2px)",
					boxShadow: glow(0.4),
					animation: `orb-spin-reverse ${3.2 / speed}s linear infinite`,
				}}
			/>

			{/* ── Bright intersection highlights ── */}
			<div
				className="absolute rounded-full"
				style={{
					top: "6%",
					left: "15%",
					width: size * 0.1,
					height: size * 0.1,
					background: `radial-gradient(circle, rgb(237 233 254 / ${f(gi * 0.4)}), transparent 70%)`,
					filter: `blur(${size * 0.03}px)`,
					animation: `orb-spin ${7 / speed}s ease-in-out infinite`,
				}}
			/>
			<div
				className="absolute rounded-full"
				style={{
					bottom: "8%",
					right: "12%",
					width: size * 0.12,
					height: size * 0.12,
					background: `radial-gradient(circle, rgb(237 233 254 / ${f(gi * 0.35)}), transparent 70%)`,
					filter: `blur(${size * 0.03}px)`,
					animation: `orb-spin-reverse ${6 / speed}s ease-in-out infinite`,
				}}
			/>
		</div>
	);
}

/** Format a number to 2 decimal places for CSS */
function f(n: number): string {
	return Math.min(n, 1).toFixed(2);
}

/** Small orb for bottom nav */
export function OrbMini({ active = false }: { active?: boolean }) {
	return (
		<div className="relative flex h-11 w-11 items-center justify-center">
			{active && (
				<div
					className="absolute inset-0 rounded-full"
					style={{
						background:
							"radial-gradient(circle, rgb(167 139 250 / 0.25), transparent 70%)",
						filter: "blur(6px)",
					}}
				/>
			)}
			<div
				className={`relative h-8 w-8 rounded-full border-2 transition-all duration-300 ${
					active
						? "border-violet-400 shadow-[0_0_10px_rgb(167_139_250/0.3)]"
						: "border-stone-300"
				}`}
			>
				<div
					className={`absolute inset-[28%] rounded-full transition-colors duration-300 ${
						active ? "bg-violet-400" : "bg-stone-300"
					}`}
				/>
			</div>
		</div>
	);
}
