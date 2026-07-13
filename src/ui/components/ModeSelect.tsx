import { useState } from "react";

export type Mode = "local" | "human-vs-agent" | "agent-vs-agent";

interface ModeSelectProps {
  onSelect: (mode: Mode, detail: { humanColor?: "w" | "b" }) => Promise<void>;
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(detail: { humanColor?: "w" | "b" } = {}) {
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
        <h1 className="app__title">♛ Шахматы</h1>
        <p className="app__subtitle">Выберите режим игры</p>
      </header>

      <main className="app__main app__main--menu">
        <section className="modeselect">
          <div className="modeselect__cards">
            <ModeCard
              active={mode === "local"}
              icon="👥"
              title="Локально"
              description="Два человека за одним экраном. Без сервера и агентов."
              onClick={() => setMode("local")}
            />
            <ModeCard
              active={mode === "human-vs-agent"}
              icon="🧑‍💻🆚🤖"
              title="Человек против агента"
              description="Ты ходишь на доске, агент подключается через MCP."
              onClick={() => setMode("human-vs-agent")}
            />
            <ModeCard
              active={mode === "agent-vs-agent"}
              icon="🤖🆚🤖"
              title="Агент против агента"
              description="Два MCP-агента играют, ты наблюдаешь."
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
                Начать локальную партию
              </button>
            </div>
          )}

          {mode === "human-vs-agent" && (
            <div className="modeselect__panel">
              <div className="modeselect__row">
                <span className="modeselect__label">Твой цвет:</span>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "w"}
                    onChange={() => setHumanColor("w")}
                  />{" "}
                  Белые
                </label>
                <label className="modeselect__radio">
                  <input
                    type="radio"
                    name="human-color"
                    checked={humanColor === "b"}
                    onChange={() => setHumanColor("b")}
                  />{" "}
                  Чёрные
                </label>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start({ humanColor })}
                disabled={busy}
              >
                {busy ? "Создаём…" : "Начать матч"}
              </button>
              <p className="modeselect__hint">
                После старта попроси агента вызвать <code>join_game</code>.
                Свободная сторона определится автоматически.
              </p>
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
                {busy ? "Создаём…" : "Начать матч для агентов"}
              </button>
              <p className="modeselect__hint">
                Первый агент вызывает <code>join_game</code> с выбранным цветом,
                второй получает оставшуюся сторону.
              </p>
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
