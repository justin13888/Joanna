/**
 * Speech-to-Text API Route
 *
 * POST /api/speech
 * Accepts audio input (WAV, MP3, etc.) and returns transcribed text.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { GeminiService, type AudioMimeType } from "@/server/services";

// Request schema
const speechRequestSchema = z.object({
    audio: z.string(), // base64 encoded audio
    mimeType: z.enum([
        "audio/wav",
        "audio/mp3",
        "audio/aiff",
        "audio/aac",
        "audio/ogg",
        "audio/flac",
    ]),
});

export async function POST(request: NextRequest) {
    // Parse body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    // Validate input
    const parseResult = speechRequestSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json(
            { error: "Invalid request", details: parseResult.error.flatten() },
            { status: 400 },
        );
    }

    const { audio, mimeType } = parseResult.data;

    // Initialize Gemini service
    const geminiService = new GeminiService({
        apiKey: env.GOOGLE_API_KEY,
        model: env.LLM_MODEL,
    });

    // Transcribe audio
    try {
        const transcript = await geminiService.transcribe({
            audioData: audio,
            mimeType: mimeType as AudioMimeType,
        });

        return NextResponse.json({
            success: true,
            transcript,
        });
    } catch (error) {
        console.error("Speech-to-text error:", error);
        return NextResponse.json(
            { error: "Failed to transcribe audio" },
            { status: 500 },
        );
    }
}
