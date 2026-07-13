// Корневой компонент: экран выбора режима → локальная игра (hot-seat) или
// онлайн-игра через MCP (:5173/mcp) с real-time доской (SSE /events).

import { useCallback, useState } from "react";
import type { Color, PieceType, Square } from "@/engine";
import { useChessGame } from "./hooks/useChessGame";
import { Board } from "./components/Board";
import { CapturedPieces } from "./components/CapturedPieces";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { GameStatusView } from "./components/GameStatusView";
import { Icon } from "./components/Icon";
import { MoveHistory } from "./components/MoveHistory";
import { PromotionDialog } from "./components/PromotionDialog";
import { ModeSelect, type Mode } from "./components/ModeSelect";
import { OnlineGame } from "./components/OnlineGame";
import { createGame } from "./hooks/useOnlineChessGame";
import { LanguageSwitcher, useI18n } from "./i18n";

type View =
  | { kind: "menu" }
  | { kind: "local" }
  | {
      kind: "online";
      mode: "human-vs-agent" | "agent-vs-agent";
      humanColor: Color | null;
    };

export default function App() {
  const [view, setView] = useState<View>({ kind: "menu" });

  const onSelect = useCallback(
    async (mode: Mode, detail: { humanColor?: "w" | "b" }) => {
      if (mode === "local") {
        setView({ kind: "local" });
        return;
      }
      const humanColor: Color | null =
        mode === "human-vs-agent"
          ? detail.humanColor === "b"
            ? "b"
            : "w"
          : null;
      await createGame(mode, humanColor);
      setView({
        kind: "online",
        mode,
        humanColor,
      });
    },
    [],
  );

  if (view.kind === "menu") {
    return <ModeSelect onSelect={onSelect} />;
  }
  if (view.kind === "online") {
    return (
      <OnlineGame
        mode={view.mode}
        humanColor={view.humanColor}
        onExit={() => setView({ kind: "menu" })}
      />
    );
  }
  return <LocalGame onExit={() => setView({ kind: "menu" })} />;
}

/** Локальная hot-seat игра (как до интеграции с MCP), плюс кнопка выхода в меню. */
function LocalGame({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  const { state, dispatch, inCheckSquare, legalTargets } = useChessGame();
  const [confirmAction, setConfirmAction] = useState<"new" | "exit" | null>(
    null,
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (state.selected !== null && legalTargets.has(square)) {
        dispatch({ type: "attempt-move", to: square });
        return;
      }
      dispatch({ type: "select", square });
    },
    [state.selected, legalTargets, dispatch],
  );

  const handlePromote = useCallback(
    (piece: PieceType) => dispatch({ type: "promote", piece }),
    [dispatch],
  );

  const handleCancelPromotion = useCallback(
    () => dispatch({ type: "cancel-promotion" }),
    [dispatch],
  );

  const turn = state.position.turn;
  const topColor: Color = state.flipped ? "w" : "b";
  const bottomColor: Color = topColor === "w" ? "b" : "w";

  return (
    <div className="app app--game">
      <header className="app__header">
        <LanguageSwitcher />
        <h1 className="app__title">{t.title}</h1>
        <p className="app__subtitle">{t.localSubtitle}</p>
      </header>

      <main className="game-layout" aria-label={t.gameLabel}>
        <div className="game-layout__top-player">
          <PlayerRail
            color={topColor}
            active={topColor === turn}
            board={state.position.board}
          />
        </div>

        <div className="game-layout__top-actions">
          <button
            type="button"
            className="btn btn--primary game-layout__new-game"
            onClick={() => setConfirmAction("new")}
          >
            {t.newGame}
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
            legalTargets={legalTargets}
            lastMove={state.lastMove}
            checkSquare={inCheckSquare}
            flipped={state.flipped}
            onSquareClick={handleSquareClick}
          />
          {state.pendingPromotion && (
            <PromotionDialog
              color={turn}
              onSelect={handlePromote}
              onCancel={handleCancelPromotion}
            />
          )}
        </div>

        <div className="game-layout__bottom-player">
          <PlayerRail
            color={bottomColor}
            active={bottomColor === turn}
            board={state.position.board}
          />
        </div>

        <aside className="game-sidebar">
          <nav className="game-actions" aria-label={t.controlsLabel}>
            <button
              type="button"
              className="btn game-action"
              onClick={() => dispatch({ type: "flip" })}
            >
              <Icon name="flip" />
              {t.flipBoard}
            </button>
            <button
              type="button"
              className="btn game-action"
              onClick={() => dispatch({ type: "undo" })}
              disabled={state.history.length === 0}
            >
              <Icon name="undo" />
              {t.undo}
            </button>
          </nav>

          <GameStatusView status={state.status} turn={turn} />

          <MoveHistory history={state.history} />
        </aside>
      </main>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === "new" ? t.newGameTitle : t.exitTitle}
          description={
            confirmAction === "new"
              ? t.resetLocalDescription
              : t.exitLocalDescription
          }
          confirmLabel={confirmAction === "new" ? t.restart : t.exit}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "new") dispatch({ type: "new-game" });
            else onExit();
            setConfirmAction(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerRail({
  color,
  active,
  board,
}: {
  color: Color;
  active: boolean;
  board: Parameters<typeof CapturedPieces>[0]["board"];
}) {
  const { colorName } = useI18n();
  return (
    <div className={`game-side ${active ? "game-side--active" : ""}`}>
      <span className="game-side__label">{colorName(color)}</span>
      <CapturedPieces board={board} side={color} />
    </div>
  );
}
