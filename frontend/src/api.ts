import type { BattleHandlers } from "./apiTypes";
import type { RapperConfig, VoiceOption } from "./types";

export type { BattleHandlers };

export async function fetchVoices(): Promise<VoiceOption[]> {
  const res = await fetch("/api/voices");
  if (!res.ok) throw new Error("Failed to load voices");
  const data = (await res.json()) as { voices: VoiceOption[] };
  return data.voices;
}

function parseSseChunk(raw: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = raw.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return events;
}

export async function streamBattle(
  rapperA: RapperConfig,
  rapperB: RapperConfig,
  handlers: BattleHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/battle/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rapperA, rapperB }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(text || `Battle request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    const joined = parts.join("\n\n");
    if (!joined) continue;

    for (const { event, data } of parseSseChunk(joined + "\n\n")) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = { raw: data };
      }
      handlers.onEvent(event, parsed);
    }
  }

  if (buffer.trim()) {
    for (const { event, data } of parseSseChunk(buffer + "\n\n")) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = { raw: data };
      }
      handlers.onEvent(event, parsed);
    }
  }
}
