/**
 * Custom Next.js Server with WebSocket Support
 *
 * Handles both HTTP (Next.js) and WebSocket (live transcription) on the same port.
 * WebSocket connections upgrade on path: /ws/live
 *
 * Run with: pnpm dev:ws
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { GeminiLiveService } from "./services/gemini-live.service";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

// Validate required env
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY environment variable is required");
    process.exit(1);
}

const geminiLive = new GeminiLiveService({ apiKey: GOOGLE_API_KEY });

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Create WebSocket server attached to HTTP server (no separate port)
    const wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade requests
    server.on("upgrade", (request, socket, head) => {
        const { pathname } = parse(request.url!);

        if (pathname === "/ws/live") {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        } else {
            // Reject other upgrade requests
            socket.destroy();
        }
    });

    // Handle WebSocket connections
    wss.on("connection", async (ws: WebSocket) => {
        console.log("[WS] Client connected to /ws/live");

        let session: Awaited<ReturnType<typeof geminiLive.createSession>> | null = null;

        try {
            session = await geminiLive.createSession({
                onTranscript: (text) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "transcript", text }));
                    }
                },
                onError: (error) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "error", message: error.message }));
                    }
                },
                onClose: () => {
                    console.log("[WS] Gemini session closed");
                },
            });

            ws.send(JSON.stringify({ type: "ready" }));
        } catch (error) {
            console.error("[WS] Failed to create Gemini session:", error);
            ws.send(JSON.stringify({ type: "error", message: "Failed to initialize transcription" }));
            ws.close();
            return;
        }

        ws.on("message", (data: Buffer | string) => {
            if (!session) return;

            try {
                if (Buffer.isBuffer(data)) {
                    const base64Audio = data.toString("base64");
                    session.sendAudio(base64Audio);
                } else {
                    const message = JSON.parse(data.toString());
                    if (message.type === "audio" && message.data) {
                        session.sendAudio(message.data);
                    } else if (message.type === "end") {
                        // Signal end of audio to flush pending transcriptions
                        session.endAudio();
                    }
                }
            } catch (error) {
                console.error("[WS] Error processing message:", error);
            }
        });

        ws.on("close", () => {
            console.log("[WS] Client disconnected");
            session?.close();
        });

        ws.on("error", (error) => {
            console.error("[WS] WebSocket error:", error);
            session?.close();
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket live transcription on ws://${hostname}:${port}/ws/live`);
    });
});
