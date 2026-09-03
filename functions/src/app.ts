import express from "express";
import cors from "cors";
import { VOICES } from "./voices";
import { runBattleStream } from "./battle";
import type { BattleRequest } from "./types";

export const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "rapbattle" });
});

app.get("/voices", (_req, res) => {
  res.json({ voices: VOICES });
});

app.get("/api/voices", (_req, res) => {
  res.json({ voices: VOICES });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "rapbattle" });
});

async function handleBattle(req: express.Request, res: express.Response): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  try {
    const body = req.body as BattleRequest;
    await runBattleStream(body, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Battle failed";
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  } finally {
    res.end();
  }
}

app.post("/battle/stream", (req, res) => {
  void handleBattle(req, res);
});

app.post("/api/battle/stream", (req, res) => {
  void handleBattle(req, res);
});
