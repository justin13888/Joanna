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
			className={`relative overflow-auto rounded-2xl border border-violet-200/40 bg-white shadow-sm shadow-violet-200/20 ${className}`}
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
			<div className="absolute inset-y-0 left-11 w-px bg-rose-300/30" />
			{children}
		</div>
	);
}

/* ─── Writing pencil animation ─── */

function WritingPencil() {
	return (
		<span className="relative -top-1 ml-1.5 inline-flex items-center align-middle">
			<span
				className="inline-block"
				style={{
					animation: "pencil-write 1.6s ease-in-out infinite",
					transformOrigin: "85% 85%",
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path
						d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
						stroke="rgb(167 139 250)"
						strokeWidth="1.5"
						fill="rgb(237 233 254 / 0.5)"
					/>
					<path
						d="m15 5 4 4"
						stroke="rgb(167 139 250)"
						strokeWidth="1.5"
					/>
					<path
						d="M3.842 16.174 L2.02 21.356 L6.373 20.036 Z"
						fill="rgb(196 181 253)"
						stroke="none"
					/>
				</svg>
			</span>
			<span
				className="absolute bottom-1.5 -left-0.5 h-1 w-1 rounded-full bg-violet-400"
				style={{ animation: "pencil-dot 0.8s ease-in-out infinite" }}
			/>
		</span>
	);
}

/* ─── Main component ─── */

export function VoiceScreen() {
	const [state, setState] = useState<VoiceState>("idle");
	const [transcript, setTranscript] = useState("");
	const [interimText, setInterimText] = useState("");
	const [aiResponse, setAiResponse] = useState("");
	const [volume, setVolume] = useState(0);
	const [contextPrompt, setContextPrompt] = useState(CONTEXT_PROMPTS[0]);

	const wsRef = useRef<WebSocket | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const animFrameRef = useRef<number>(0);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const stateRef = useRef<VoiceState>("idle");

	stateRef.current = state;

	/* ── client-only random prompt (hydration safe) ── */
	useEffect(() => {
		setContextPrompt(
			CONTEXT_PROMPTS[Math.floor(Math.random() * CONTEXT_PROMPTS.length)] ??
				CONTEXT_PROMPTS[0],
		);
	}, []);

	/* ── WebSocket ── */
	useEffect(() => {
		const ws = new WebSocket("ws://localhost:3000/ws/live");

		ws.onmessage = (e) => {
			const data = JSON.parse(e.data);
			if (data.type === "transcript") {
				setTranscript((prev) => prev + data.text);
				requestAnimationFrame(() => {
					scrollRef.current!.scrollTop =
						scrollRef.current!.scrollHeight;
				});
			}
		};

		wsRef.current = ws;
		return () => ws.close();
	}, []);

	/* ── Start listening ── */
	const startListening = useCallback(async () => {
		if (stateRef.current === "listening") return;

		setTranscript("");
		setInterimText("");
		setAiResponse("");

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				sampleRate: 16000,
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
			},
		});

		streamRef.current = stream;

		const ctx = new AudioContext({ sampleRate: 16000 });
		audioCtxRef.current = ctx;

		const source = ctx.createMediaStreamSource(stream);
		sourceRef.current = source;

		const processor = ctx.createScriptProcessor(4096, 1, 1);
		processorRef.current = processor;

		processor.onaudioprocess = (e) => {
			if (stateRef.current !== "listening") return;
			if (wsRef.current?.readyState !== WebSocket.OPEN) return;

			const input = e.inputBuffer.getChannelData(0);
			const pcm = new Int16Array(input.length);

			for (let i = 0; i < input.length; i++) {
				pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
			}

			wsRef.current.send(pcm.buffer);
		};

		source.connect(processor);
		processor.connect(ctx.destination);

		setState("listening");
	}, []);

	/* ── Stop listening ── */
	const stopListening = useCallback(async () => {
		if (stateRef.current !== "listening") return;

		wsRef.current?.send(JSON.stringify({ type: "end" }));

		processorRef.current?.disconnect();
		sourceRef.current?.disconnect();
		streamRef.current?.getTracks().forEach((t) => t.stop());
		await audioCtxRef.current?.close();

		setState("processing");

		await new Promise((r) => setTimeout(r, 500));
		await generateSpeech();
	}, []);

	/* ── TTS ── */
	const generateSpeech = async () => {
		if (!transcript.trim()) {
			setState("idle");
			return;
		}

		setState("speaking");
		setAiResponse("Thinking...");

		const res = await fetch("/api/tts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: `You said: ${transcript}` }),
		});

		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);

		audioPlayerRef.current = audio;
		setAiResponse(`"${transcript}"`);

		audio.onended = () => {
			URL.revokeObjectURL(url);
			setState("idle");
		};

		audio.play();
	};

	/* ── Reset ── */
	const resetVoice = () => {
		audioPlayerRef.current?.pause();
		setTranscript("");
		setInterimText("");
		setAiResponse("");
		setVolume(0);
		setState("idle");
	};

	/* ── UI ── */
	return (
		<div className="relative flex h-full flex-col px-4 pt-[52px] pb-3">
			<NotebookPaper className="mb-3 flex-1 min-h-0">
				<div ref={scrollRef} className="h-full overflow-y-auto p-4 pl-14">
					<h2 className="mb-2 font-handwriting text-xl text-violet-400">
						Joanna
					</h2>

					{state === "idle" && !transcript && (
						<p className="italic text-stone-400">{contextPrompt}</p>
					)}

					{(state === "listening" || transcript) && (
						<p className="text-base leading-7">
							<span className="text-stone-700">{transcript}</span>
							<span className="italic text-stone-400">
								{interimText}
							</span>
							{state === "listening" && <WritingPencil />}
						</p>
					)}

					{aiResponse && (
						<div className="mt-4 border-t pt-4">
							<p className="text-xs uppercase text-violet-400">
								Joanna
							</p>
							<p className="text-violet-600">{aiResponse}</p>
						</div>
					)}
				</div>
			</NotebookPaper>

			<div className="flex flex-col items-center gap-3">
				<button
					onPointerDown={startListening}
					onPointerUp={stopListening}
					className="select-none"
				>
					<Orb
						isActive={state !== "idle"}
						size={140}
						volume={volume}
					/>
				</button>

				{state === "idle" && transcript && (
					<button onClick={resetVoice}>Start Over</button>
				)}
			</div>
		</div>
	);
}
