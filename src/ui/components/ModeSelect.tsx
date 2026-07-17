import { useState } from "react";
import { LanguageSwitcher, useI18n } from "../i18n";

export type Mode =
  "local" | "human-vs-algorithm" | "human-vs-agent" | "agent-vs-agent";
export type AlgorithmDifficulty = "easy" | "medium" | "hard";

interface ModeSelectProps {
  onSelect: (
    mode: Mode,
    detail: {
      humanColor?: "w" | "b";
      algorithmDifficulty?: AlgorithmDifficulty;
    },
  ) => Promise<void>;
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  const { t, colorName } = useI18n();
  const [mode, setMode] = useState<Mode | null>(null);
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [algorithmDifficulty, setAlgorithmDifficulty] =
    useState<AlgorithmDifficulty>("easy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(
    detail: {
      humanColor?: "w" | "b";
      algorithmDifficulty?: AlgorithmDifficulty;
    } = {},
  ) {
    if (!mode || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSelect(mode, detail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <LanguageSwitcher />
        <h1 className="app__title">{t.title}</h1>
        <p className="app__subtitle">{t.chooseMode}</p>
      </header>

      <main className="app__main app__main--menu">
        <section className="modeselect">
          <div className="modeselect__cards">
            <ModeCard
              active={mode === "local"}
              icon="👥"
              title={t.localMode}
              description={t.localDescription}
              onClick={() => setMode("local")}
            />
            <ModeCard
              active={mode === "human-vs-algorithm"}
              icon="🧑‍🦱🆚♟️"
              title={t.humanVsAlgorithm}
              description={t.humanVsAlgorithmDescription}
              onClick={() => setMode("human-vs-algorithm")}
            />
            <ModeCard
              active={mode === "human-vs-agent"}
              icon="🧑‍💻🆚🤖"
              title={t.humanVsAgent}
              description={t.humanVsAgentDescription}
              onClick={() => setMode("human-vs-agent")}
            />
            <ModeCard
              active={mode === "agent-vs-agent"}
              icon="🤖🆚🤖"
              title={t.agentVsAgent}
              description={t.agentVsAgentDescription}
              onClick={() => setMode("agent-vs-agent")}
            />
          </div>

          {mode === "local" && (
            <div className="modeselect__panel">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start()}
                disabled={busy}
              >
                {t.startLocal}
              </button>
            </div>
          )}

          {mode === "human-vs-agent" && (
            <div className="modeselect__panel">
              <div className="modeselect__row">
                <span className="modeselect__label">{t.yourColor}</span>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "w"}
                    onChange={() => setHumanColor("w")}
                  />{" "}
                  {colorName("w")}
                </label>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "b"}
                    onChange={() => setHumanColor("b")}
                  />{" "}
                  {colorName("b")}
                </label>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start({ humanColor })}
                disabled={busy}
              >
                {busy ? t.creating : t.startMatch}
              </button>
              <p className="modeselect__hint">{t.humanHint}</p>
            </div>
          )}

          {mode === "human-vs-algorithm" && (
            <div className="modeselect__panel">
              <div className="modeselect__row">
                <span className="modeselect__label">{t.yourColor}</span>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "w"}
                    onChange={() => setHumanColor("w")}
                  />{" "}
                  {colorName("w")}
                </label>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "b"}
                    onChange={() => setHumanColor("b")}
                  />{" "}
                  {colorName("b")}
                </label>
              </div>
              <div className="modeselect__row">
                <span className="modeselect__label">{t.difficulty}</span>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="algorithm-difficulty"
                    checked={algorithmDifficulty === "easy"}
                    onChange={() => setAlgorithmDifficulty("easy")}
                  />{" "}
                  {t.difficultyEasy}
                </label>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="algorithm-difficulty"
                    checked={algorithmDifficulty === "medium"}
                    onChange={() => setAlgorithmDifficulty("medium")}
                  />{" "}
                  {t.difficultyMedium}
                </label>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="algorithm-difficulty"
                    checked={algorithmDifficulty === "hard"}
                    onChange={() => setAlgorithmDifficulty("hard")}
                  />{" "}
                  {t.difficultyHard}
                </label>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start({ humanColor, algorithmDifficulty })}
                disabled={busy}
              >
                {t.startAlgorithmMatch}
              </button>
              <p className="modeselect__hint">{t.algorithmHint}</p>
            </div>
          )}

          {mode === "agent-vs-agent" && (
            <div className="modeselect__panel">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start()}
                disabled={busy}
              >
                {busy ? t.creating : t.startAgentMatch}
              </button>
              <p className="modeselect__hint">{t.agentHint}</p>
            </div>
          )}

          {error && <p className="modeselect__error">{error}</p>}
        </section>
      </main>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`modeselect__card ${active ? "modeselect__card--active" : ""}`}
      onClick={onClick}
    >
      <span className="modeselect__icon">{icon}</span>
      <span className="modeselect__title">{title}</span>
      <span className="modeselect__desc">{description}</span>
    </button>
  );
}
