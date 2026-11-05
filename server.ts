import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  SYSTEM_INSTRUCTION,
  buildPrompt,
  cleanInstruction,
  parseInstructionRequest,
} from "./server/instruction";

const PORT = Number(process.env.PORT) || 3000;
// gemini-2.0-flash was shut down on 1 June 2026. Flash-Lite is the fastest and
// cheapest current model and is plenty for a two-sentence micro-instruction.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const REQUEST_TIMEOUT_MS = 10_000;

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/** The SDK's own message is often empty; the API's message lives in the body. */
function describeError(error: unknown): string {
  const err = error as { status?: number; body?: unknown; message?: string } | null;
  let detail = err?.message ?? String(error);
  if (typeof err?.body === "string") {
    try {
      const parsed = JSON.parse(err.body);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (typeof first?.error?.message === "string") detail = first.error.message;
    } catch {
      // Not JSON: keep the SDK message.
    }
  }
  return `${err?.status ?? "unknown status"}: ${detail}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4kb" }));

  app.post("/api/generate-instruction", async (req, res) => {
    // Without a key the client falls back to its built-in instructions.
    if (!ai) {
      res.status(503).json({ error: "ai_unavailable" });
      return;
    }

    try {
      const request = parseInstructionRequest(req.body);
      const interaction = await ai.interactions.create(
        {
          model: MODEL,
          input: buildPrompt(request),
          system_instruction: SYSTEM_INSTRUCTION,
          // Requests describe someone in distress; do not keep them server side.
          store: false,
        },
        { timeout_ms: REQUEST_TIMEOUT_MS },
      );

      const instruction = cleanInstruction(interaction.output_text);
      if (!instruction) {
        res.status(502).json({ error: "empty_response" });
        return;
      }
      res.json({ instruction });
    } catch (error: unknown) {
      console.error(`Gemini request failed (${describeError(error)})`);
      res.status(502).json({ error: "ai_failed" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    // Imported lazily so the production bundle never loads Vite.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (model: ${MODEL})`);
    if (!ai) {
      console.warn("GEMINI_API_KEY is not set: the app will only use its built-in instructions.");
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
