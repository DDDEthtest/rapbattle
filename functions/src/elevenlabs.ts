export async function streamSpeech(opts: {
  voiceId: string;
  text: string;
  languageCode?: string;
  onChunk: (chunk: Buffer) => void;
}): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const params = new URLSearchParams({
    output_format: "mp3_44100_128",
  });

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}/stream?${params}`;
  const body: Record<string, unknown> = {
    text: opts.text,
    model_id: "eleven_flash_v2_5",
    voice_settings: {
      stability: 0.35,
      similarity_boost: 0.75,
      style: 0.45,
      use_speaker_boost: true,
    },
  };
  if (opts.languageCode) {
    body.language_code = opts.languageCode;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${errText.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) opts.onChunk(Buffer.from(value));
  }
}
