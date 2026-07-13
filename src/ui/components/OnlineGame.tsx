import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "@/engine";
import {
  type GameSnapshot,
  type OnlineMode,
  createGame,
  useOnlineChessGame,
} from "../hooks/useOnlineChessGame";
import { Board } from "./Board";
import { CapturedPieces } from "./CapturedPieces";
import { GameStatusView } from "./GameStatusView";
import { PromotionDialog } from "./PromotionDialog";

interface OnlineGameProps {
  mode: OnlineMode;
  humanColor: Color | null;
  onExit: () => void;
}

const COLOR_NAME: Record<Color, string> = { w: "Белые", b: "Чёрные" };

export function OnlineGame({ mode, humanColor, onExit }: OnlineGameProps) {
  const online = useOnlineChessGame();
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void online.connect(humanColor).catch((error) => {
      if (!cancelled) {
        online.setError(error instanceof Error ? error.message : String(error));
      }
    });
    return () => {
      cancelled = true;
      online.disconnect();
    };
    // Методы hook стабильны; запуск нужен один раз для уже созданной партии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exit = useCallback(() => {
    online.disconnect();
    onExit();
  }, [online, onExit]);

  const restart = useCallback(async () => {
    setRestarting(true);
    online.setError(null);
    try {
      await createGame(mode, humanColor);
      await online.connect(humanColor);
    } catch (error) {
      online.setError(error instanceof Error ? error.message : String(error));
    } finally {
      setRestarting(false);
    }
  }, [humanColor, mode, online]);

  const { state } = online;
  if (!state.snapshot || !state.position) {
    return <WaitingScreen error={state.error} onExit={exit} />;
  }

  const snapshot = state.snapshot;
  const turn = snapshot.turn;
  const topColor: Color = state.flipped ? "w" : "b";
  const bottomColor: Color = topColor === "w" ? "b" : "w";
  const terminal = snapshot.status.kind !== "ongoing";

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">♛ Шахматы</h1>
        <p className="app__subtitle">
          {mode === "human-vs-agent"
            ? "Человек против агента"
            : "Агент против агента · наблюдение"}
        </p>
      </header>

      <main className="app__main">
        <section className="app__game" aria-label="Шахматная партия">
          <PlayerRail
            color={topColor}
            snapshot={snapshot}
            board={state.position.board}
          />
          <div className="app__board-wrap">
            <Board
              position={state.position}
              selected={state.selected}
              legalTargets={online.legalTargets}
              lastMove={online.lastMoveSquares}
              checkSquare={online.inCheckSquare}
              flipped={state.flipped}
              onSquareClick={online.onSquareClick}
            />
            {state.pendingPromotion && (
              <PromotionDialog
                color={turn}
                onSelect={online.onPromote}
                onCancel={online.cancelPromotion}
              />
            )}
          </div>
          <PlayerRail
            color={bottomColor}
            snapshot={snapshot}
            board={state.position.board}
          />
        </section>

        <aside className="app__panel">
          <GameStatusView status={snapshot.status} turn={turn} />

          <OnlineStatusLine
            snapshot={snapshot}
            connected={state.connected}
            interactable={online.canInteract}
            humanColor={humanColor}
            submitting={state.submitting}
            error={state.error}
          />

          <OnlineMoveHistory sans={snapshot.moveHistory} />

          <div className="panel__actions">
            <div className="panel__section-title">Действия</div>
            <ControlsOnline
              connected={state.connected}
              isFlipped={state.flipped}
              canRestart={terminal}
              restarting={restarting}
              onRestart={() => void restart()}
              onFlip={online.flip}
              onExit={exit}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}

function PlayerRail({
  color,
  snapshot,
  board,
}: {
  color: Color;
  snapshot: GameSnapshot;
  board: Parameters<typeof CapturedPieces>[0]["board"];
}) {
  const player = snapshot.players[color];
  const detail =
    player === "human"
      ? "Человек"
      : snapshot.agentConnected[color]
        ? "Агент · подключён"
        : "Агент · ожидается";
  return (
    <div
      className={`game-side ${
        color === snapshot.turn ? "game-side--active" : ""
      }`}
    >
      <span className="game-side__label">
        {COLOR_NAME[color]} · {detail}
      </span>
      <CapturedPieces board={board} side={color} />
    </div>
  );
}

function OnlineStatusLine({
  snapshot,
  connected,
  interactable,
  humanColor,
  submitting,
  error,
}: {
  snapshot: GameSnapshot;
  connected: boolean;
  interactable: boolean;
  humanColor: Color | null;
  submitting: boolean;
  error: string | null;
}) {
  let text: string;
  if (error) {
    text = `⚠ ${error}`;
  } else if (!connected) {
    text = "Подключение к партии…";
  } else if (submitting) {
    text = "Отправка хода…";
  } else if (snapshot.status.kind !== "ongoing") {
    text = "Партия завершена";
  } else if (interactable) {
    text = "Твой ход";
  } else if (
    snapshot.players[snapshot.turn] === "agent" &&
    !snapshot.agentConnected[snapshot.turn]
  ) {
    text = `Ожидаем агента за ${COLOR_NAME[snapshot.turn]}`;
  } else if (humanColor === null) {
    text = `👁 Наблюдение · ход за ${COLOR_NAME[snapshot.turn]}`;
  } else {
    text = `Ход за ${COLOR_NAME[snapshot.turn]} — ждём…`;
  }
  return (
    <div className={`status status--${error ? "check" : "play"}`}>
      <span className="status__text">{text}</span>
    </div>
  );
}

function OnlineMoveHistory({ sans }: { sans: string[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const rows: Array<{ no: number; white?: string; black?: string }> = [];
  for (let index = 0; index < sans.length; index++) {
    const moveNumber = Math.floor(index / 2) + 1;
    if (index % 2 === 0) rows.push({ no: moveNumber, white: sans[index] });
    else rows[rows.length - 1].black = sans[index];
  }

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [sans.length]);

  return (
    <div className="history">
      <div className="history__head">Ходы партии</div>
      <div className="history__list" ref={listRef}>
        {rows.length === 0 && (
          <div className="history__empty">Партия ещё не началась</div>
        )}
        {rows.map((row) => (
          <div className="history__row" key={row.no}>
            <span className="history__no">{row.no}.</span>
            <span className="history__white">{row.white}</span>
            <span className="history__black">{row.black ?? ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlsOnline({
  connected,
  isFlipped,
  canRestart,
  restarting,
  onRestart,
  onFlip,
  onExit,
}: {
  connected: boolean;
  isFlipped: boolean;
  canRestart: boolean;
  restarting: boolean;
  onRestart: () => void;
  onFlip: () => void;
  onExit: () => void;
}) {
  return (
    <div className="controls">
      {canRestart && (
        <button
          type="button"
          className="btn btn--primary"
          onClick={onRestart}
          disabled={restarting}
        >
          {restarting ? "Создаём…" : "Новая партия"}
        </button>
      )}
      <button type="button" className="btn" onClick={onFlip}>
        {isFlipped ? "↑ Перевернуть" : "↓ Перевернуть"}
      </button>
      <button type="button" className="btn" onClick={onExit}>
        ← Выйти в меню
      </button>
      <span className="connection-dot" aria-live="polite">
        <span aria-hidden="true">{connected ? "●" : "●"}</span>
        {connected ? " Подключено" : " Нет связи"}
      </span>
    </div>
  );
}

function WaitingScreen({
  error,
  onExit,
}: {
  error: string | null;
  onExit: () => void;
}) {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">♛ Шахматы</h1>
      </header>
      <main className="app__main app__main--menu">
        <section className="modeselect">
          <p>Подключение к активной партии…</p>
          {error && <p className="modeselect__error">{error}</p>}
          <button type="button" className="btn" onClick={onExit}>
            ← Назад
          </button>
        </section>
      </main>
    </div>
  );
}
