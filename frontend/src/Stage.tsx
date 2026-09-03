import type { JudgeVerdict, RapperConfig, RapperId, TurnState } from "./types";

interface Props {
  rapperA: RapperConfig;
  rapperB: RapperConfig;
  activeRapper: RapperId | null;
  round: number;
  turns: TurnState[];
  currentLyrics: string;
  verdict: JudgeVerdict | null;
  status: string;
  onRestart: () => void;
}

export function Stage({
  rapperA,
  rapperB,
  activeRapper,
  round,
  turns,
  currentLyrics,
  verdict,
  status,
  onRestart,
}: Props) {
  return (
    <div className="stage">
      <div className="stage-top">
        <p className="round-pill">{verdict ? "FINAL" : `ROUND ${round || 1} / 3`}</p>
        <p className="stage-status">{status}</p>
      </div>

      <div className="vs-row">
        <div className={`mc-slot ${activeRapper === "a" ? "live" : ""}`}>
          <span className="mc-label">MC A</span>
          <strong>{rapperA.name}</strong>
          <small>
            {rapperA.style} · {rapperA.language}
          </small>
        </div>
        <div className="vs-mark">VS</div>
        <div className={`mc-slot ${activeRapper === "b" ? "live" : ""}`}>
          <span className="mc-label">MC B</span>
          <strong>{rapperB.name}</strong>
          <small>
            {rapperB.style} · {rapperB.language}
          </small>
        </div>
      </div>

      <div className="lyrics-board" aria-live="polite">
        {currentLyrics ? (
          currentLyrics.split("\n").map((line, i) => (
            <p key={`${i}-${line.slice(0, 12)}`} className="bar-line">
              {line}
            </p>
          ))
        ) : (
          <p className="lyrics-placeholder">Waiting for bars…</p>
        )}
      </div>

      {verdict && (
        <div className="verdict-card">
          <p className="verdict-eyebrow">AI JUDGE</p>
          <h2>{verdict.winnerName} wins</h2>
          <p className="verdict-line">{verdict.announcerLine}</p>
          <p className="verdict-critique">{verdict.critique}</p>
          <div className="score-row">
            <span>Punchlines {verdict.scores.punchlines}</span>
            <span>Rebuttal {verdict.scores.rebuttal}</span>
            <span>Style {verdict.scores.style}</span>
          </div>
          <button type="button" className="cta" onClick={onRestart}>
            Run another battle
          </button>
        </div>
      )}

      <ol className="turn-log">
        {turns
          .filter((t) => t.done)
          .map((t) => (
            <li key={t.id}>
              <strong>
                R{t.round} · {t.name}
              </strong>
              <span>{t.lyrics.split("\n")[0]}…</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
