/**
 * ElevenLabsService
 *
 * Handles text-to-speech generation using ElevenLabs API.
 */
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export interface TTSOptions {
    voiceId?: string;
    modelId?: string;
}

// Default voice IDs - can be customized
export const VOICES = {
    // ElevenLabs pre-made voices
    RACHEL: "21m00Tcm4TlvDq8ikWAM", // Calm, natural female
    DOMI: "AZnzlk1XvdvUeBnXmlld", // Strong, energetic female
    BELLA: "EXAVITQu4vr4xnSDxMaL", // Soft, warm female
    ANTONI: "ErXwobaYiN019PkySvjV", // Well-rounded male
    ELLI: "MF3mGyEYCl7XYWbV9V6O", // Emotional young female
    JOSH: "TxGEqnHWrfWFTfGW9XjX", // Deep young male
    ADAM: "pNInz6obpgDQGcFmaJgB", // Deep middle-aged male
    SAM: "yoZ06aMxZJJ28mfd3POQ", // Raspy young male
} as const;

export class ElevenLabsService {
    private client: ElevenLabsClient;
    private defaultVoiceId: string;
    private defaultModelId: string;

    constructor(config: { apiKey: string; defaultVoiceId?: string; defaultModelId?: string }) {
        this.client = new ElevenLabsClient({ apiKey: config.apiKey });
        this.defaultVoiceId = config.defaultVoiceId ?? VOICES.RACHEL;
        // Use flash v2.5 for ultra-low latency (fastest model)
        this.defaultModelId = config.defaultModelId ?? "eleven_flash_v2_5";
    }

    /**
     * Convert text to speech audio.
     * Returns a Buffer of audio data (MP3 format).
     */
    async textToSpeech(text: string, options?: TTSOptions): Promise<Buffer> {
        const audioStream = await this.client.textToSpeech.convert(
            options?.voiceId ?? this.defaultVoiceId,
            {
                text,
                modelId: options?.modelId ?? this.defaultModelId,
            }
        );

        // Collect chunks from the stream
        const chunks: Buffer[] = [];
        const reader = audioStream.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }

        return Buffer.concat(chunks);
    }

    /**
     * Convert text to speech and return as a streaming Response.
     */
    async textToSpeechStream(text: string, options?: TTSOptions): Promise<ReadableStream<Uint8Array>> {
        const audioStream = await this.client.textToSpeech.convert(
            options?.voiceId ?? this.defaultVoiceId,
            {
                text,
                modelId: options?.modelId ?? this.defaultModelId,
            }
        );

        return audioStream;
    }

    /**
     * List available voices.
     */
    async listVoices() {
        return this.client.voices.getAll();
    }
}
