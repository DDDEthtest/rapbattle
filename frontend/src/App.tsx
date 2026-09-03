import { useEffect, useMemo, useRef, useState } from "react";
import { fetchVoices, streamBattle } from "./api";
import { BattleAudio } from "./audio";
import { RapperForm } from "./RapperForm";
import { Stage } from "./Stage";
import {
  DEFAULT_A,
  DEFAULT_B,
  type JudgeVerdict,
  type RapperConfig,
  type RapperId,
  type TurnState,
  type VoiceOption,
} from "./types";

type Screen = "setup" | "battle";

const FALLBACK_VOICES: VoiceOption[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: "warm · male" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: "clear · female" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", labels: "casual · male" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", labels: "bright · female" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", labels: "intense · male" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: "confident · female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", labels: "deep · male" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", labels: "expressive · female" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", labels: "narrator · male" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", labels: "sharp · female" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", labels: "gritty · male" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", labels: "bold · female" },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [voices, setVoices] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [rapperA, setRapperA] = useState<RapperConfig>(DEFAULT_A);
  const [rapperB, setRapperB] = useState<RapperConfig>(DEFAULT_B);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Configuring…");
  const [activeRapper, setActiveRapper] = useState<RapperId | null>(null);
  const [round, setRound] = useState(1);
  const [turns, setTurns] = useState<TurnState[]>([]);
  const [currentLyrics, setCurrentLyrics] = useState("");
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);

  const audioRef = useRef(new BattleAudio());
  const abortRef = useRef<AbortController | null>(null);
  const pendingAudio = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    void fetchVoices()
      .then(setVoices)
      .catch(() => setVoices(FALLBACK_VOICES));
    return () => {
      abortRef.current?.abort();
      audioRef.current.dispose();
    };
  }, []);

  const canStart = useMemo(
    () => rapperA.name.trim().length > 0 && rapperB.name.trim().length > 0,
    [rapperA.name, rapperB.name]
  );

  async function startBattle() {
    setError(null);
    setVerdict(null);
    setTurns([]);
    setCurrentLyrics("");
    setActiveRapper(null);
    setRound(1);
    setStatus("Cueing the beat…");
    setScreen("battle");

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    pendingAudio.current = new Map();

    try {
      await audioRef.current.startBeat();
      setStatus("Writing opening bars…");

      await streamBattle(
        rapperA,
        rapperB,
        {
          onEvent: (event, raw) => {
            const data = raw as Record<string, unknown>;
            if (event === "turn-start") {
              const id = String(data.id);
              const rapper = data.rapper as RapperId;
              const r = Number(data.round);
              setActiveRapper(rapper);
              setRound(r);
              setCurrentLyrics("");
              setStatus(`${String(data.name)} — round ${r}`);
              setTurns((prev) => [
                ...prev.filter((t) => t.id !== id),
                {
                  id,
                  rapper,
                  round: r,
                  name: String(data.name),
                  lyrics: "",
                  audioChunks: [],
                  done: false,
                },
              ]);
              pendingAudio.current.set(id, []);
            } else if (event === "lyrics") {
              const id = String(data.id);
              const delta = String(data.delta || "");
              setCurrentLyrics((prev) => prev + delta);
              setTurns((prev) =>
                prev.map((t) => (t.id === id ? { ...t, lyrics: t.lyrics + delta } : t))
              );
            } else if (event === "lyrics-done") {
              const id = String(data.id);
              const text = String(data.text || "");
              setCurrentLyrics(text);
              setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, lyrics: text } : t)));
            } else if (event === "audio") {
              const id = String(data.id);
              const chunk = String(data.chunk || "");
              const list = pendingAudio.current.get(id) || [];
              list.push(chunk);
              pendingAudio.current.set(id, list);
            } else if (event === "turn-end") {
              const id = String(data.id);
              const chunks = pendingAudio.current.get(id) || [];
              if (chunks.length) audioRef.current.enqueueBase64Mp3(chunks);
              setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
              setStatus("Next MC loading…");
            } else if (event === "verdict") {
              setVerdict(data as unknown as JudgeVerdict);
              setActiveRapper(null);
              setStatus("Judge has spoken");
            } else if (event === "announcer-audio") {
              const chunk = String(data.chunk || "");
              if (chunk) audioRef.current.enqueueBase64Mp3([chunk]);
            } else if (event === "error") {
              setError(String(data.message || "Battle failed"));
              setStatus("Error");
            } else if (event === "done") {
              setStatus("Battle complete");
            }
          },
        },
        ac.signal
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Battle failed");
      setStatus("Error");
    }
  }

  function restart() {
    abortRef.current?.abort();
    audioRef.current.stopBeat();
    setScreen("setup");
    setVerdict(null);
    setTurns([]);
    setCurrentLyrics("");
    setError(null);
    setStatus("Configuring…");
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />
      <div className="tape" aria-hidden="true" />

      <header className="brand-block">
        <p className="brand">RAPBATTLE</p>
        {screen === "setup" && (
          <>
            <h1>Two MCs. Three rounds. One judge.</h1>
            <p className="lede">
              Pick personalities, styles, languages, and voices — then let Gemini write and
              ElevenLabs spit.
            </p>
          </>
        )}
      </header>

      {screen === "setup" ? (
        <main className="setup">
          <div className="forms">
            <RapperForm
              label="MC A"
              accent="a"
              value={rapperA}
              voices={voices}
              onChange={setRapperA}
            />
            <RapperForm
              label="MC B"
              accent="b"
              value={rapperB}
              voices={voices}
              onChange={setRapperB}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="button" className="cta" disabled={!canStart} onClick={() => void startBattle()}>
            Start battle
          </button>
        </main>
      ) : (
        <main>
          {error && <p className="error">{error}</p>}
          <Stage
            rapperA={rapperA}
            rapperB={rapperB}
            activeRapper={activeRapper}
            round={round}
            turns={turns}
            currentLyrics={currentLyrics}
            verdict={verdict}
            status={status}
            onRestart={restart}
          />
          {!verdict && (
            <button type="button" className="ghost" onClick={restart}>
              Abort
            </button>
          )}
        </main>
      )}
    </div>
  );
}
