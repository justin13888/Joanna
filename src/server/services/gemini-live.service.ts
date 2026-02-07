/**
 * GeminiLiveService
 *
 * Handles real-time audio streaming with Gemini Live API.
 * Provides bidirectional audio-to-text transcription.
 */
import { GoogleGenAI, Modality } from "@google/genai";

export interface LiveTranscriptionCallbacks {
    onTranscript: (text: string) => void;
    onError: (error: Error) => void;
    onClose: () => void;
}

export class GeminiLiveService {
    private client: GoogleGenAI;
    private model: string;

    constructor(config: { apiKey: string; model?: string }) {
        this.client = new GoogleGenAI({ apiKey: config.apiKey });
        // Use the native audio model for live transcription
        this.model = config.model ?? "gemini-2.5-flash-native-audio-preview-12-2025";
    }

    /**
     * Create a live transcription session.
     * Returns a session object that can send audio and receive transcriptions.
     */
    async createSession(callbacks: LiveTranscriptionCallbacks) {
        const session = await this.client.live.connect({
            model: this.model,
            config: {
                // Native audio model requires AUDIO output, but we can get transcription from inputAudioTranscription
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},  // Enable input transcription
                systemInstruction: "Just acknowledge what the user says briefly.",
            },
            callbacks: {
                onopen: () => {
                    console.log("[GeminiLive] Connected");
                },
                onmessage: (message) => {
                    // Log all messages for debugging
                    console.log("[GeminiLive] Message received:", JSON.stringify(message, null, 2).slice(0, 500));

                    // Only output the input transcription (what the user said)
                    if (message.serverContent?.inputTranscription?.text) {
                        console.log("[GeminiLive] Transcription:", message.serverContent.inputTranscription.text);
                        callbacks.onTranscript(message.serverContent.inputTranscription.text);
                    }
                },
                onerror: (error) => {
                    console.error("[GeminiLive] Error:", error);
                    console.error("[GeminiLive] Error details:", JSON.stringify(error, null, 2));
                    callbacks.onError(new Error(error.message || "Live API error"));
                },
                onclose: (event) => {
                    console.log("[GeminiLive] Closed - reason:", event?.reason || "unknown");
                    console.log("[GeminiLive] Close event:", JSON.stringify(event, null, 2));
                    callbacks.onClose();
                },
            },
        });

        return {
            /**
             * Send audio data to Gemini for live transcription.
             * @param audioData - Base64 encoded PCM audio (16-bit, 16kHz)
             */
            sendAudio: (audioData: string) => {
                session.sendRealtimeInput({
                    audio: {
                        data: audioData,
                        mimeType: "audio/pcm;rate=16000",
                    },
                });
            },

            /**
             * Signal end of audio input to flush pending transcriptions.
             */
            endAudio: () => {
                // Send activity end to trigger transcription of remaining audio
                session.sendClientContent({ turnComplete: true });
            },

            /**
             * Close the session.
             */
            close: () => {
                session.close();
            },
        };
    }
}
