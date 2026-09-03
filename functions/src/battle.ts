import type { Response } from "express";
import { generateBarsStreaming, buildBarsPrompt, judgeBattle, elevenLanguage } from "./gemini";
import { streamSpeech } from "./elevenlabs";
import { ANNOUNCER_VOICE_ID } from "./voices";
import type { BattleRequest, RapperConfig, RapperId } from "./types";

function sse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function validateRapper(r: RapperConfig, label: string): void {
  if (!r?.name?.trim()) throw new Error(`${label}.name is required`);
  if (!r.personality) throw new Error(`${label}.personality is required`);
  if (!r.style) throw new Error(`${label}.style is required`);
  if (!r.language) throw new Error(`${label}.language is required`);
  if (!r.voiceId) throw new Error(`${label}.voiceId is required`);
}

export async function runBattleStream(req: BattleRequest, res: Response): Promise<void> {
  validateRapper(req.rapperA, "rapperA");
  validateRapper(req.rapperB, "rapperB");

  const a = { ...req.rapperA, name: req.rapperA.name.trim().slice(0, 40) };
  const b = { ...req.rapperB, name: req.rapperB.name.trim().slice(0, 40) };

  sse(res, "battle-start", {
    rapperA: { name: a.name },
    rapperB: { name: b.name },
  });

  const historyLines: string[] = [];
  let turnCounter = 0;

  for (let round = 1; round <= 3; round++) {
    for (const side of ["a", "b"] as RapperId[]) {
      turnCounter += 1;
      const turnId = `r${round}-${side}`;
      const mc = side === "a" ? a : b;
      const opponent = side === "a" ? b : a;
      const goingFirst = side === "a";

      sse(res, "turn-start", {
        id: turnId,
        rapper: side,
        round,
        name: mc.name,
        turn: turnCounter,
      });

      const prompt = buildBarsPrompt({
        mc,
        opponent,
        round,
        goingFirst,
        history: historyLines.join("\n\n"),
      });

      const lyrics = await generateBarsStreaming(prompt, (delta) => {
        sse(res, "lyrics", { id: turnId, delta });
      });

      const cleaned = lyrics
        .split("\n")
        .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
        .filter(Boolean)
        .join("\n");

      sse(res, "lyrics-done", { id: turnId, text: cleaned });
      historyLines.push(`[Round ${round} — ${mc.name}]\n${cleaned}`);

      await streamSpeech({
        voiceId: mc.voiceId,
        text: cleaned.replace(/\n/g, ". "),
        languageCode: elevenLanguage(mc.language),
        onChunk: (chunk) => {
          sse(res, "audio", { id: turnId, chunk: chunk.toString("base64") });
        },
      });

      sse(res, "turn-end", { id: turnId, rapper: side, round });
    }
  }

  const verdict = await judgeBattle({
    rapperA: a,
    rapperB: b,
    transcript: historyLines.join("\n\n"),
  });

  const winnerName = verdict.winner === "a" ? a.name : b.name;
  sse(res, "verdict", {
    ...verdict,
    winnerName,
  });

  await streamSpeech({
    voiceId: ANNOUNCER_VOICE_ID,
    text: verdict.announcerLine,
    languageCode: "en",
    onChunk: (chunk) => {
      sse(res, "announcer-audio", { chunk: chunk.toString("base64") });
    },
  });

  sse(res, "done", {});
}
