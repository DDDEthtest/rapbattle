import {
  ELEVEN_LANG,
  LANGUAGE_LABEL,
  type JudgeVerdict,
  type LanguageCode,
  type RapperConfig,
  type RapperId,
} from "./types";

function modelId(): string {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

const generationConfig = {
  temperature: 0.95,
  maxOutputTokens: 1024,
  // Gemini 3.x uses thinkingLevel; MINIMAL keeps battle turns fast
  thinkingConfig: { thinkingLevel: "MINIMAL" },
};

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

async function generateText(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId()}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return text.trim();
}

async function* streamText(prompt: string): AsyncGenerator<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId()}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text();
    throw new Error(`Gemini stream error ${res.status}: ${body.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n");
    buffer = chunks.pop() || "";

    for (const line of chunks) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const piece = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        if (piece) yield piece;
      } catch {
        // ignore partial JSON
      }
    }
  }
}

function langName(code: LanguageCode): string {
  return LANGUAGE_LABEL[code];
}

export function buildBarsPrompt(opts: {
  mc: RapperConfig;
  opponent: RapperConfig;
  round: number;
  goingFirst: boolean;
  history: string;
}): string {
  const { mc, opponent, round, goingFirst, history } = opts;
  return `You are a battle rapper named "${mc.name}".
Personality: ${mc.personality}
Rap style: ${mc.style}
Language: write ALL lyrics in ${langName(mc.language)} only (native slang OK).

This is round ${round} of 3. You are ${goingFirst ? "going first" : "responding second"}.
Opponent: "${opponent.name}" (${opponent.personality}, ${opponent.style}).

Battle so far:
${history || "(opening round — set the tone)"}

Write 8 to 12 bars of freestyle battle rap. Strong rhymes, punchlines, flow suited to ${mc.style}.
If the opponent already rapped, roast and rebut specific lines.
Keep it battle-rap heat, but: no racial/gender/religious slurs, no sexual content involving minors, no real-world violent threats or doxxing.

Output ONLY the lyrics, one bar per line. No title, no intro, no quotes, no stage directions.`;
}

export async function generateBarsStreaming(
  prompt: string,
  onDelta: (delta: string) => void
): Promise<string> {
  let full = "";
  try {
    for await (const delta of streamText(prompt)) {
      full += delta;
      onDelta(delta);
    }
  } catch (err) {
    // Fallback to non-streaming if SSE fails (some auth key setups)
    if (!full) {
      full = await generateText(prompt);
      onDelta(full);
    } else {
      throw err;
    }
  }
  return full.trim();
}

export async function judgeBattle(opts: {
  rapperA: RapperConfig;
  rapperB: RapperConfig;
  transcript: string;
}): Promise<JudgeVerdict> {
  const { rapperA, rapperB, transcript } = opts;
  const prompt = `You are a sharp, fair battle-rap judge.
Rapper A: ${rapperA.name} (${rapperA.personality}, ${rapperA.style}, ${langName(rapperA.language)})
Rapper B: ${rapperB.name} (${rapperB.personality}, ${rapperB.style}, ${langName(rapperB.language)})

Full battle transcript:
${transcript}

Score punchlines, rebuttal, and style (1-10 each). Pick one winner: "a" or "b".
Write a short critique (2-3 sentences) in English.
Write one spoken announcer line crowning the winner (English, under 25 words), energetic like a live battle host.

Return ONLY valid JSON with this shape:
{"winner":"a"|"b","scores":{"punchlines":n,"rebuttal":n,"style":n},"critique":"...","announcerLine":"..."}`;

  const raw = await generateText(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Judge returned no JSON");
  const parsed = JSON.parse(match[0]) as JudgeVerdict;
  if (parsed.winner !== "a" && parsed.winner !== "b") {
    throw new Error("Invalid winner in judge response");
  }
  return parsed;
}

export function elevenLanguage(code: LanguageCode): string {
  return ELEVEN_LANG[code];
}

export type { RapperId };
