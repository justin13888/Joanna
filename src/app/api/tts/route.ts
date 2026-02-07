/**
 * Text-to-Speech API Endpoint
 *
 * POST /api/tts
 * Body: { text: string, voiceId?: string }
 * Response: Audio stream (MP3)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { ElevenLabsService, VOICES } from "@/server/services/elevenlabs.service";

const requestSchema = z.object({
    text: z.string().min(1).max(5000),
    voiceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parseResult = requestSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { text, voiceId } = parseResult.data;

        const elevenlabs = new ElevenLabsService({
            apiKey: env.ELEVENLABS_API_KEY,
        });

        const audioBuffer = await elevenlabs.textToSpeech(text, {
            voiceId: voiceId ?? VOICES.RACHEL,
        });

        // Return audio with appropriate headers
        return new Response(new Uint8Array(audioBuffer), {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("TTS error:", error);
        return NextResponse.json(
            { error: "Failed to generate speech" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tts
 * Returns available voices
 */
export async function GET() {
    return NextResponse.json({
        voices: VOICES,
        description: "Use any of these voice IDs in the voiceId parameter",
    });
}
