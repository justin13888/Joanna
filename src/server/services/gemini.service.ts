/**
* GeminiService
*
* Handles direct interactions with Google Gemini API for multimodal processing.
* Supports audio transcription.
*/
import { GoogleGenAI } from "@google/genai";

export type AudioMimeType =
    | "audio/wav"
    | "audio/mp3"
    | "audio/aiff"
    | "audio/aac"
    | "audio/ogg"
    | "audio/flac";

export class GeminiService {
    private client: GoogleGenAI;
    private model: string;

    constructor(config: { apiKey: string; model?: string }) {
        this.client = new GoogleGenAI({ apiKey: config.apiKey });
        this.model = config.model ?? "gemini-2.0-flash";
    }

    /**
     * Transcribe audio to text using Gemini multimodal model.
     */
    async transcribe(params: {
        audioData: string; // base64 encoded audio
        mimeType: AudioMimeType;
    }): Promise<string> {
        const { audioData, mimeType } = params;

        const response = await this.client.models.generateContent({
            model: this.model,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType,
                                data: audioData,
                            },
                        },
                        {
                            text: "Transcribe this audio exactly. Only output the transcription, nothing else.",
                        },
                    ],
                },
            ],
        });

        return response.text ?? "";
    }
}
