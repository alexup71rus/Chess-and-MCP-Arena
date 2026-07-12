// Корневой компонент приложения: связывает доску и боковую панель.

import { useCallback } from "react";
import type { PieceType, Square } from "@/engine";
import { useChessGame } from "./hooks/useChessGame";
import { Board } from "./components/Board";
import { GameStatusView } from "./components/GameStatusView";
import { MoveHistory } from "./components/MoveHistory";
import { CapturedPieces } from "./components/CapturedPieces";
import { Controls } from "./components/Controls";
import { PromotionDialog } from "./components/PromotionDialog";

export default function App() {
  const { state, dispatch, inCheckSquare, legalTargets } = useChessGame();

  const handleSquareClick = useCallback(
    (square: Square) => {
      // Если уже выбрана фигура и клик по легальной цели — ход.
      if (state.selected !== null && legalTargets.has(square)) {
        dispatch({ type: "attempt-move", to: square });
        return;
      }
      // Иначе — выбор фигуры (reducer сам отфильтрует чужие/пустые).
      dispatch({ type: "select", square });
    },
    // dispatch из useReducer стабилен по контракту React.
    [state.selected, legalTargets, dispatch],
  );

  const handlePromote = useCallback(
    (piece: PieceType) => {
      dispatch({ type: "promote", piece });
    },
    [dispatch],
  );

  const handleCancelPromotion = useCallback(() => {
    dispatch({ type: "cancel-promotion" });
  }, [dispatch]);

  const turn = state.position.turn;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">♛ Шахматы</h1>
        <p className="app__subtitle">Классическая партия — горячие места</p>
      </header>

      <main className="app__main">
        <section className="app__board-wrap">
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
        </section>

        <aside className="app__panel">
          <div className="panel__player panel__player--top">
            <span className="panel__player-label">
              {turn === "w" ? "Чёрные" : "Белые"}
            </span>
            <CapturedPieces
              board={state.position.board}
              side={turn === "w" ? "b" : "w"}
            />
          </div>

          <GameStatusView status={state.status} turn={turn} />

          <MoveHistory history={state.history} />

          <div className="panel__player panel__player--bottom">
            <span className="panel__player-label">
              {turn === "w" ? "Белые" : "Чёрные"}
            </span>
            <CapturedPieces board={state.position.board} side={turn} />
          </div>

          <Controls
            canUndo={state.history.length > 0}
            isFlipped={state.flipped}
            onNewGame={() => dispatch({ type: "new-game" })}
            onUndo={() => dispatch({ type: "undo" })}
            onFlip={() => dispatch({ type: "flip" })}
          />
        </aside>
      </main>

      <footer className="app__footer">
        React + TypeScript · все правила шахмат · {state.history.length}{" "}
        {pluralMoves(state.history.length)}
      </footer>
    </div>
  );
}

function pluralMoves(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ход";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "хода";
  return "ходов";
}
