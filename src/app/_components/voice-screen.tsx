"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTEXT_PROMPTS } from "./dummy-data";
import { Orb } from "./orb";

type VoiceState = "idle" | "listening" | "stopped";

/* ─── Notebook paper component ─── */

function NotebookPaper({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`relative overflow-hidden rounded-2xl border border-violet-200/40 bg-white shadow-sm shadow-violet-200/20 ${className}`}
			style={{
				backgroundImage: `repeating-linear-gradient(
					transparent,
					transparent 31px,
					rgb(196 181 253 / 0.18) 31px,
					rgb(196 181 253 / 0.18) 32px
				)`,
				backgroundPosition: "0 11px",
			}}
		>
			{/* Red margin line */}
			<div className="absolute inset-y-0 left-11 w-px bg-rose-300/30" />
			{children}
		</div>
	);
}

/* ─── Main component ─── */

export function VoiceScreen() {
	const [state, setState] = useState<VoiceState>("idle");
	const [transcript, setTranscript] = useState("");
	const [interimText, setInterimText] = useState("");
	const [isSupported, setIsSupported] = useState(true);
	const [contextPrompt] = useState(
		() => CONTEXT_PROMPTS[Math.floor(Math.random() * CONTEXT_PROMPTS.length)],
	);

	// Audio volume for reactive orb
	const [volume, setVolume] = useState(0);

	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const stateRef = useRef<VoiceState>("idle");
	const transcriptRef = useRef("");
	const accumulatedRef = useRef("");

	// Audio analysis refs
	const audioCtxRef = useRef<AudioContext | null>(null);
	const animFrameRef = useRef<number>(0);
	const streamRef = useRef<MediaStream | null>(null);

	stateRef.current = state;

	/* ── Mic volume analysis ── */
	const startAudioAnalysis = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			streamRef.current = stream;

			const ctx = new AudioContext();
			audioCtxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.3;
			source.connect(analyser);

			const buf = new Uint8Array(analyser.fftSize);
			let smooth = 0;
			let lastUpdate = 0;

			const tick = () => {
				analyser.getByteTimeDomainData(buf);
				let sum = 0;
				for (let i = 0; i < buf.length; i++) {
					const v = (buf[i] - 128) / 128;
					sum += v * v;
				}
				const rms = Math.sqrt(sum / buf.length);
				smooth = smooth * 0.6 + rms * 0.4;

				// Throttle React updates to ~24fps
				const now = performance.now();
				if (now - lastUpdate > 42) {
					setVolume(Math.min(smooth * 4.5, 1));
					lastUpdate = now;
				}

				animFrameRef.current = requestAnimationFrame(tick);
			};
			tick();
		} catch {
			// Audio analysis unavailable — orb won't react, that's fine
		}
	}, []);

	const stopAudioAnalysis = useCallback(() => {
		if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
		animFrameRef.current = 0;
		audioCtxRef.current?.close().catch(() => {});
		audioCtxRef.current = null;
		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;
		setVolume(0);
	}, []);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			stopAudioAnalysis();
		};
	}, [stopAudioAnalysis]);

	/* ── Speech recognition setup ── */
	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: webkit prefix
		const SR: typeof SpeechRecognition | undefined =
			window.SpeechRecognition ??
			(window as any).webkitSpeechRecognition ??
			undefined;
		if (!SR) {
			setIsSupported(false);
			return;
		}
		const recognition = new SR();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let finalText = "";
			let interim = "";
			for (let i = 0; i < event.results.length; i++) {
				const r = event.results[i];
				if (r?.isFinal) finalText += r[0]?.transcript ?? "";
				else interim += r?.[0]?.transcript ?? "";
			}
			const full = accumulatedRef.current + finalText;
			setTranscript(full);
			transcriptRef.current = full;
			setInterimText(interim);
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error !== "no-speech" && event.error !== "aborted")
				setState("stopped");
		};

		recognition.onend = () => {
			if (stateRef.current === "listening") {
				accumulatedRef.current = transcriptRef.current;
				try {
					recognition.start();
				} catch {
					setState("stopped");
				}
			}
		};

		recognitionRef.current = recognition;
		return () => {
			recognition.abort();
		};
	}, []);

	const startListening = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition || stateRef.current === "listening") return;

		if (stateRef.current === "idle") {
			accumulatedRef.current = "";
			transcriptRef.current = "";
			setTranscript("");
			setInterimText("");
		} else {
			// "stopped" — continue appending
			accumulatedRef.current = transcriptRef.current;
		}
		try {
			recognition.start();
			startAudioAnalysis();
			setState("listening");
		} catch {
			/* already started */
		}
	}, [startAudioAnalysis]);

	const stopListening = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition || stateRef.current !== "listening") return;

		recognition.stop();
		accumulatedRef.current = transcriptRef.current;
		stopAudioAnalysis();
		setState("stopped");
	}, [stopAudioAnalysis]);

	const resetVoice = () => {
		setTranscript("");
		setInterimText("");
		transcriptRef.current = "";
		accumulatedRef.current = "";
		stopAudioAnalysis();
		setState("idle");
	};

	/* ═══════ Voice mode ═══════ */
	return (
		<div className="relative flex h-full flex-col px-4 pt-[52px] pb-3">
			{/* Transcript paper area */}
			<NotebookPaper className="mb-3 flex-1 min-h-0">
				<div className="h-full overflow-y-auto p-4 pl-14">
					{/* Header */}
					<div className="mb-2 flex items-center justify-between">
						<h2 className="font-handwriting text-xl text-violet-400">
							Joanna
						</h2>
						{state === "listening" && (
							<span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-medium text-violet-500">
								<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
								LIVE
							</span>
						)}
					</div>

					{/* Transcript content */}
					{state === "idle" && (
						<div style={{ animation: "fade-in 0.5s ease-out" }}>
							<p className="mb-3 text-sm leading-7 text-stone-400/80 italic">
								{contextPrompt}
							</p>
							<p className="text-base leading-7 font-medium text-stone-600">
								What&apos;s on your mind today?
							</p>
						</div>
					)}

					{(state === "listening" || state === "stopped") && (
						<div style={{ animation: "fade-in 0.3s ease-out" }}>
							{transcript ? (
								<p className="text-base leading-7 text-stone-700">
									{transcript}
								</p>
							) : null}
							{interimText ? (
								<span className="text-base leading-7 text-stone-400 italic">
									{interimText}
								</span>
							) : null}
							{!transcript && !interimText && state === "listening" && (
								<p className="text-base leading-7 text-stone-300 italic">
									Start speaking, your words will appear here...
								</p>
							)}
							{state === "stopped" && !transcript && (
								<p className="text-base leading-7 text-stone-300 italic">
									No speech detected. Tap the orb to try again.
								</p>
							)}
						</div>
					)}
				</div>
			</NotebookPaper>

			{/* Orb + actions */}
			<div className="flex flex-col items-center gap-3 flex-shrink-0">
				<button
					onPointerDown={isSupported ? startListening : undefined}
					onPointerUp={isSupported ? stopListening : undefined}
					onPointerLeave={isSupported ? stopListening : undefined}
					onContextMenu={(e) => e.preventDefault()}
					className="relative z-10 flex-shrink-0 select-none touch-none"
					type="button"
					aria-label={
						state === "listening" ? "Release to stop" : "Hold to speak"
					}
				>
					<Orb isActive={state === "listening"} size={140} volume={volume} />
				</button>

				<p className="text-xs text-stone-400">
					{state === "idle" && "Hold the orb to speak"}
					{state === "listening" && "Listening\u2026 release to stop"}
					{state === "stopped" && transcript && "Hold to continue recording"}
					{state === "stopped" && !transcript && "Hold to try again"}
				</p>

				{state === "stopped" && transcript && (
					<button
						onClick={resetVoice}
						className="rounded-full border border-violet-200 px-5 py-2 text-sm font-medium text-stone-500 active:bg-violet-50"
						style={{ animation: "fade-in-up 0.25s ease-out" }}
						type="button"
					>
						Start Over
					</button>
				)}

				{!isSupported && state === "idle" && (
					<p className="text-center text-xs text-stone-400">
						Voice not supported in this browser. Please use Chrome or Edge.
					</p>
				)}
			</div>
		</div>
	);
}
