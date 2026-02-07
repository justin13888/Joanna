"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTEXT_PROMPTS } from "./dummy-data";
import { Orb } from "./orb";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

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
	const [aiResponse, setAiResponse] = useState("");
	const [contextPrompt] = useState(
		() => CONTEXT_PROMPTS[Math.floor(Math.random() * CONTEXT_PROMPTS.length)],
	);

	// Audio volume for reactive orb
	const [volume, setVolume] = useState(0);

	// WebSocket and audio refs
	const wsRef = useRef<WebSocket | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const animFrameRef = useRef<number>(0);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
	const stateRef = useRef<VoiceState>("idle");

	stateRef.current = state;

	/* ── WebSocket connection ── */
	useEffect(() => {
		const connectWebSocket = () => {
			const ws = new WebSocket("ws://localhost:3000/ws/live");

			ws.onopen = () => {
				console.log("[VoiceScreen] WebSocket connected");
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === "transcript") {
						setTranscript((prev) => prev + data.text);
					} else if (data.type === "error") {
						console.error("[VoiceScreen] Transcription error:", data.message);
					}
				} catch (e) {
					console.error("[VoiceScreen] Failed to parse message:", e);
				}
			};

			ws.onclose = () => {
				console.log("[VoiceScreen] WebSocket closed, reconnecting...");
				setTimeout(connectWebSocket, 2000);
			};

			ws.onerror = (error) => {
				console.error("[VoiceScreen] WebSocket error:", error);
			};

			wsRef.current = ws;
		};

		connectWebSocket();

		return () => {
			wsRef.current?.close();
		};
	}, []);

	/* ── Start listening with audio capture ── */
	const startListening = useCallback(async () => {
		if (stateRef.current === "listening") return;

		// Reset transcript for new session
		setTranscript("");
		setAiResponse("");

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: 16000,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});
			streamRef.current = stream;

			// Create audio context for processing and volume analysis
			const ctx = new AudioContext({ sampleRate: 16000 });
			audioCtxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			sourceRef.current = source;

			// Audio processor for sending to WebSocket
			const processor = ctx.createScriptProcessor(4096, 1, 1);
			processorRef.current = processor;

			processor.onaudioprocess = (e) => {
				if (stateRef.current !== "listening") return;
				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

				const inputData = e.inputBuffer.getChannelData(0);
				// Convert float32 to int16 PCM
				const pcmData = new Int16Array(inputData.length);
				for (let i = 0; i < inputData.length; i++) {
					const sample = inputData[i] ?? 0;
					pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32768));
				}
				// Send as binary
				wsRef.current.send(pcmData.buffer);
			};

			source.connect(processor);
			processor.connect(ctx.destination);

			// Volume analysis for orb
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
					const v = ((buf[i] ?? 128) - 128) / 128;
					sum += v * v;
				}
				const rms = Math.sqrt(sum / buf.length);
				smooth = smooth * 0.6 + rms * 0.4;

				const now = performance.now();
				if (now - lastUpdate > 42) {
					setVolume(Math.min(smooth * 4.5, 1));
					lastUpdate = now;
				}

				if (stateRef.current === "listening") {
					animFrameRef.current = requestAnimationFrame(tick);
				}
			};
			tick();

			setState("listening");
		} catch (error) {
			console.error("[VoiceScreen] Failed to start audio:", error);
		}
	}, []);

	/* ── Stop listening ── */
	const stopListening = useCallback(async () => {
		if (stateRef.current !== "listening") return;

		// Signal end of audio
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ type: "end" }));
		}

		// Clean up audio
		if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
		animFrameRef.current = 0;

		processorRef.current?.disconnect();
		processorRef.current = null;
		sourceRef.current?.disconnect();
		sourceRef.current = null;

		await audioCtxRef.current?.close().catch(() => { });
		audioCtxRef.current = null;

		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;

		setVolume(0);
		setState("processing");

		// Small delay to let final transcription come through
		await new Promise((resolve) => setTimeout(resolve, 500));

		// TODO: Here you could send the transcript to an AI and get a response
		// For now, we'll just generate TTS for the transcript
		await generateSpeech();
	}, []);

	/* ── Generate TTS response ── */
	const generateSpeech = async () => {
		const currentTranscript = transcript;
		if (!currentTranscript.trim()) {
			setState("idle");
			return;
		}

		setState("speaking");
		setAiResponse("Generating response...");

		try {
			// For demo: echo back what was said with TTS
			// In production, you'd send to an AI first and speak the response
			const response = await fetch("/api/tts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: `You said: ${currentTranscript}`,
				}),
			});

			if (!response.ok) {
				throw new Error("TTS request failed");
			}

			const audioBlob = await response.blob();
			const audioUrl = URL.createObjectURL(audioBlob);

			// Play the audio
			const audio = new Audio(audioUrl);
			audioPlayerRef.current = audio;

			setAiResponse(`"${currentTranscript}"`);

			audio.onended = () => {
				URL.revokeObjectURL(audioUrl);
				setState("idle");
			};

			audio.onerror = () => {
				console.error("[VoiceScreen] Audio playback error");
				setState("idle");
			};

			await audio.play();
		} catch (error) {
			console.error("[VoiceScreen] TTS error:", error);
			setAiResponse("Failed to generate speech");
			setTimeout(() => setState("idle"), 2000);
		}
	};

	/* ── Reset ── */
	const resetVoice = () => {
		audioPlayerRef.current?.pause();
		setTranscript("");
		setAiResponse("");
		setVolume(0);
		setState("idle");
	};

	/* ═══════ Voice mode UI ═══════ */
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
						{state === "processing" && (
							<span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-600">
								Processing...
							</span>
						)}
						{state === "speaking" && (
							<span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-medium text-green-600">
								<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
								Speaking
							</span>
						)}
					</div>

					{/* Transcript content */}
					{state === "idle" && !transcript && (
						<div style={{ animation: "fade-in 0.5s ease-out" }}>
							<p className="mb-3 text-sm leading-7 text-stone-400/80 italic">
								{contextPrompt}
							</p>
							<p className="text-base leading-7 font-medium text-stone-600">
								What&apos;s on your mind today?
							</p>
						</div>
					)}

					{transcript && (
						<div style={{ animation: "fade-in 0.3s ease-out" }}>
							<p className="mb-2 text-xs text-stone-400 uppercase tracking-wide">
								You said:
							</p>
							<p className="text-base leading-7 text-stone-700">
								{transcript}
							</p>
						</div>
					)}

					{state === "listening" && !transcript && (
						<p className="text-base leading-7 text-stone-300 italic">
							Listening... speak now
						</p>
					)}

					{aiResponse && (
						<div className="mt-4 pt-4 border-t border-violet-100">
							<p className="mb-2 text-xs text-violet-400 uppercase tracking-wide">
								Joanna:
							</p>
							<p className="text-base leading-7 text-violet-600">
								{aiResponse}
							</p>
						</div>
					)}
				</div>
			</NotebookPaper>

			{/* Orb + actions */}
			<div className="flex flex-col items-center gap-3 flex-shrink-0">
				<button
					onPointerDown={state === "idle" || state === "listening" ? startListening : undefined}
					onPointerUp={state === "listening" ? stopListening : undefined}
					onPointerLeave={state === "listening" ? stopListening : undefined}
					onContextMenu={(e) => e.preventDefault()}
					className="relative z-10 flex-shrink-0 select-none touch-none"
					type="button"
					disabled={state === "processing" || state === "speaking"}
					aria-label={
						state === "listening" ? "Release to stop" : "Hold to speak"
					}
				>
					<Orb
						isActive={state === "listening" || state === "speaking"}
						size={140}
						volume={state === "speaking" ? 0.5 : volume}
					/>
				</button>

				<p className="text-xs text-stone-400">
					{state === "idle" && "Hold the orb to speak"}
					{state === "listening" && "Listening… release to stop"}
					{state === "processing" && "Processing your speech..."}
					{state === "speaking" && "Joanna is speaking..."}
				</p>

				{(state === "idle" && transcript) && (
					<button
						onClick={resetVoice}
						className="rounded-full border border-violet-200 px-5 py-2 text-sm font-medium text-stone-500 active:bg-violet-50"
						style={{ animation: "fade-in-up 0.25s ease-out" }}
						type="button"
					>
						Start Over
					</button>
				)}
			</div>
		</div>
	);
}
