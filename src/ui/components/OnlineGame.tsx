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
import { LanguageSwitcher, useI18n } from "../i18n";

interface OnlineGameProps {
  mode: OnlineMode;
  humanColor: Color | null;
  onExit: () => void;
}

export function OnlineGame({ mode, humanColor, onExit }: OnlineGameProps) {
  const { t } = useI18n();
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
        <LanguageSwitcher />
        <h1 className="app__title">{t.title}</h1>
        <p className="app__subtitle">
          {mode === "human-vs-agent"
            ? t.humanVsAgent
            : `${t.agentVsAgent} · ${t.spectating}`}
        </p>
      </header>

      <main className="game-layout" aria-label={t.gameLabel}>
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
            {restarting ? t.creating : t.newGame}
          </button>
          <button
            type="button"
            className="btn icon-btn"
            aria-label={t.exitToMenu}
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
          <nav className="game-actions" aria-label={t.controlsLabel}>
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
          title={confirmAction === "new" ? t.newGameTitle : t.exitTitle}
          description={
            confirmAction === "new"
              ? t.resetOnlineDescription
              : t.exitOnlineDescription
          }
          confirmLabel={confirmAction === "new" ? t.restart : t.exit}
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
  const { t, colorName } = useI18n();
  const player = snapshot.players[color];
  const detail = player === "human" ? t.playerHuman : t.playerAgent;
  return (
    <div
      className={`game-side ${
        color === snapshot.turn ? "game-side--active" : ""
      }`}
    >
      <span className="game-side__label">
        {colorName(color)} · {detail}
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
  const { t, colorName } = useI18n();
  const agentColors = (["w", "b"] as Color[]).filter(
    (color) => snapshot.players[color] === "agent",
  );

  return (
    <div className="agent-connections" aria-label={t.connectionsLabel}>
      {agentColors.map((color) => {
        const isConnected = connected && snapshot.agentConnected[color];
        const tone = !connected
          ? "offline"
          : isConnected
            ? "connected"
            : "waiting";
        const status = !connected
          ? t.noConnection
          : isConnected
            ? t.connected
            : t.waiting;
        return (
          <div
            className={`agent-connection agent-connection--${tone}`}
            key={color}
          >
            <span className="agent-connection__side">
              {t.playerAgent} · {colorName(color)}
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
  const { t } = useI18n();
  if (!error && !submitting) return null;
  return (
    <div className={`game-notice ${error ? "game-notice--error" : ""}`}>
      {error
        ? `⚠ ${error === "connection-lost" ? t.connectionLost : error}`
        : t.sendingMove}
    </div>
  );
}

function OnlineMoveHistory({ sans }: { sans: string[] }) {
  const { t } = useI18n();
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
      <div className="history__head">{t.history}</div>
      <div className="history__list" ref={listRef}>
        {rows.length === 0 && (
          <div className="history__empty">{t.gameNotStarted}</div>
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
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="btn game-action game-actions__wide"
      aria-label={isFlipped ? t.resetBoard : t.flipBoard}
      onClick={onFlip}
    >
      <Icon name="flip" />
      {t.flipBoard}
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
  const { t } = useI18n();
  return (
    <div className="app">
      <header className="app__header">
        <LanguageSwitcher />
        <h1 className="app__title">{t.title}</h1>
      </header>
      <main className="app__main app__main--menu">
        <section className="modeselect">
          <p>{t.connecting}</p>
          {error && <p className="modeselect__error">{error}</p>}
          <button type="button" className="btn game-action" onClick={onExit}>
            <Icon name="arrow-left" />
            {t.back}
          </button>
        </section>
      </main>
    </div>
  );
}
