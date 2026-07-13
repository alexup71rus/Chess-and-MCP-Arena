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
import { ConfirmDialog } from "./ConfirmDialog";
import { GameStatusView } from "./GameStatusView";
import { Icon } from "./Icon";
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
  const [confirmAction, setConfirmAction] = useState<"new" | "exit" | null>(
    null,
  );

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
    <div className="app app--game">
      <header className="app__header">
        <h1 className="app__title">♛ Шахматы</h1>
        <p className="app__subtitle">
          {mode === "human-vs-agent"
            ? "Человек против агента"
            : "Агент против агента · наблюдение"}
        </p>
      </header>

      <main className="game-layout" aria-label="Шахматная партия">
        <div className="game-layout__top-player">
          <PlayerRail
            color={topColor}
            snapshot={snapshot}
            board={state.position.board}
          />
        </div>

        <div className="game-layout__top-actions">
          <button
            type="button"
            className="btn btn--primary game-layout__new-game"
            onClick={() => setConfirmAction("new")}
            disabled={!terminal || restarting}
          >
            {restarting ? "Создаём…" : "Новая партия"}
          </button>
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Выйти в главное меню"
            onClick={() => setConfirmAction("exit")}
          >
            <Icon name="arrow-right" />
          </button>
        </div>

        <div className="app__board-wrap game-layout__board">
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

        <div className="game-layout__bottom-player">
          <PlayerRail
            color={bottomColor}
            snapshot={snapshot}
            board={state.position.board}
          />
        </div>

        <aside className="game-sidebar">
          <nav className="game-actions" aria-label="Управление партией">
            <ControlsOnline isFlipped={state.flipped} onFlip={online.flip} />
          </nav>

          <AgentConnections snapshot={snapshot} connected={state.connected} />

          <GameStatusView status={snapshot.status} turn={turn} />

          <OnlineNotice submitting={state.submitting} error={state.error} />

          <OnlineMoveHistory sans={snapshot.moveHistory} />
        </aside>
      </main>

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction === "new" ? "Начать новую партию?" : "Выйти в меню?"
          }
          description={
            confirmAction === "new"
              ? "Текущая онлайн-партия будет заменена новой."
              : "Текущая онлайн-партия будет закрыта для этого клиента."
          }
          confirmLabel={confirmAction === "new" ? "Начать заново" : "Выйти"}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "new") void restart();
            else exit();
            setConfirmAction(null);
          }}
        />
      )}
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
  const detail = player === "human" ? "Человек" : "Агент";
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

function AgentConnections({
  snapshot,
  connected,
}: {
  snapshot: GameSnapshot;
  connected: boolean;
}) {
  const agentColors = (["w", "b"] as Color[]).filter(
    (color) => snapshot.players[color] === "agent",
  );

  return (
    <div className="agent-connections" aria-label="Подключения агентов">
      {agentColors.map((color) => {
        const isConnected = connected && snapshot.agentConnected[color];
        const tone = !connected
          ? "offline"
          : isConnected
            ? "connected"
            : "waiting";
        const status = !connected
          ? "Нет связи"
          : isConnected
            ? "Подключён"
            : "Ожидается";
        return (
          <div
            className={`agent-connection agent-connection--${tone}`}
            key={color}
          >
            <span className="agent-connection__side">
              Агент · {COLOR_NAME[color]}
            </span>
            <span className="agent-connection__status">
              <span className="agent-connection__dot" aria-hidden="true" />
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OnlineNotice({
  submitting,
  error,
}: {
  submitting: boolean;
  error: string | null;
}) {
  if (!error && !submitting) return null;
  return (
    <div className={`game-notice ${error ? "game-notice--error" : ""}`}>
      {error ? `⚠ ${error}` : "Отправка хода…"}
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
  isFlipped,
  onFlip,
}: {
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className="btn game-action game-actions__wide"
      aria-label={isFlipped ? "Вернуть обычный вид доски" : "Перевернуть доску"}
      onClick={onFlip}
    >
      <Icon name="flip" />
      Доска
    </button>
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
          <button type="button" className="btn game-action" onClick={onExit}>
            <Icon name="arrow-left" />
            Назад
          </button>
        </section>
      </main>
    </div>
  );
}
