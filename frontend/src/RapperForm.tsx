import type { RapperConfig, VoiceOption } from "./types";
import { LANGUAGES, PERSONALITIES, RAP_STYLES } from "./types";

interface Props {
  label: string;
  value: RapperConfig;
  voices: VoiceOption[];
  onChange: (next: RapperConfig) => void;
  accent: "a" | "b";
}

export function RapperForm({ label, value, voices, onChange, accent }: Props) {
  const set = <K extends keyof RapperConfig>(key: K, v: RapperConfig[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section className={`rapper-form accent-${accent}`}>
      <header>
        <span className="corner-tag">{label}</span>
        <h2>MC</h2>
      </header>

      <label>
        <span>Name</span>
        <input
          value={value.name}
          maxLength={40}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Stage name"
        />
      </label>

      <label>
        <span>Personality</span>
        <select
          value={value.personality}
          onChange={(e) => set("personality", e.target.value as RapperConfig["personality"])}
        >
          {PERSONALITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Rap style</span>
        <select
          value={value.style}
          onChange={(e) => set("style", e.target.value as RapperConfig["style"])}
        >
          {RAP_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Language</span>
        <select
          value={value.language}
          onChange={(e) => set("language", e.target.value as RapperConfig["language"])}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Voice</span>
        <select value={value.voiceId} onChange={(e) => set("voiceId", e.target.value)}>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.labels}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
