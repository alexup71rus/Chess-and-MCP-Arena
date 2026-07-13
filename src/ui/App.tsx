// Корневой компонент: экран выбора режима → локальная игра (hot-seat) или
// онлайн-игра через MCP (:5173/mcp) с real-time доской (SSE /events).

import { useCallback, useState } from "react";
import type { Color, PieceType, Square } from "@/engine";
import { useChessGame } from "./hooks/useChessGame";
import { Board } from "./components/Board";
import { GameStatusView } from "./components/GameStatusView";
import { MoveHistory } from "./components/MoveHistory";
import { CapturedPieces } from "./components/CapturedPieces";
import { Controls } from "./components/Controls";
import { PromotionDialog } from "./components/PromotionDialog";
import { ModeSelect, type Mode } from "./components/ModeSelect";
import { OnlineGame } from "./components/OnlineGame";
import { createGame } from "./hooks/useOnlineChessGame";

type View =
  | { kind: "menu" }
  | { kind: "local" }
  | {
      kind: "online";
      mode: "human-vs-agent" | "agent-vs-agent";
      humanColor: Color | null;
    };

const COLOR_NAME: Record<Color, string> = { w: "Белые", b: "Чёрные" };

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
  const { state, dispatch, inCheckSquare, legalTargets } = useChessGame();

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
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">♛ Шахматы</h1>
        <p className="app__subtitle">Классическая партия — горячие места</p>
      </header>

      <main className="app__main">
        <section className="app__game" aria-label="Шахматная партия">
          <PlayerRail
            color={topColor}
            active={topColor === turn}
            board={state.position.board}
          />
          <div className="app__board-wrap">
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
          <PlayerRail
            color={bottomColor}
            active={bottomColor === turn}
            board={state.position.board}
          />
        </section>

        <aside className="app__panel">
          <GameStatusView status={state.status} turn={turn} />

          <MoveHistory history={state.history} />

          <div className="panel__actions">
            <div className="panel__section-title">Действия</div>
            <Controls
              canUndo={state.history.length > 0}
              isFlipped={state.flipped}
              onNewGame={() => dispatch({ type: "new-game" })}
              onUndo={() => dispatch({ type: "undo" })}
              onFlip={() => dispatch({ type: "flip" })}
            />
            <div className="controls">
              <button type="button" className="btn" onClick={onExit}>
                ← Выйти в меню
              </button>
            </div>
          </div>
        </aside>
      </main>
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
  return (
    <div className={`game-side ${active ? "game-side--active" : ""}`}>
      <span className="game-side__label">{COLOR_NAME[color]}</span>
      <CapturedPieces board={board} side={color} />
    </div>
  );
}
