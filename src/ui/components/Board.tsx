// Доска: сетка 8×8 с координатами, подсветкой и обработкой кликов.

import { memo } from "react";
import type { Position, Square } from "@/engine";
import { fileOf, rankOf } from "@/engine";
import { Piece } from "./Piece";

interface BoardProps {
  position: Position;
  selected: Square | null;
  legalTargets: Set<Square>;
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  flipped: boolean;
  onSquareClick: (square: Square) => void;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function BoardImpl({
  position,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  flipped,
  onSquareClick,
}: BoardProps) {
  // Порядок обхода клеток зависит от ориентации доски.
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="board">
      {ranks.map((r) =>
        files.map((f) => {
          const sq: Square = r * 8 + f;
          const piece = position.board[sq];
          const isDark = (rankOf(sq) + fileOf(sq)) % 2 === 1;
          const isSelected = selected === sq;
          const isTarget = legalTargets.has(sq);
          const isCapture = isTarget && piece !== null;
          const isLastMove =
            lastMove !== null && (lastMove.from === sq || lastMove.to === sq);
          const isCheck = checkSquare === sq;
          const showFileLabel = r === (flipped ? 7 : 0);
          const showRankLabel = f === (flipped ? 0 : 7);

          const classes = [
            "square",
            isDark ? "square--dark" : "square--light",
            isSelected && "square--selected",
            isLastMove && "square--last-move",
            isCheck && "square--check",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={sq}
              type="button"
              className={classes}
              onClick={() => onSquareClick(sq)}
              aria-label={FILES[f] + (r + 1)}
            >
              {showFileLabel && (
                <span
                  className={`square__coord square__coord--file ${
                    isDark
                      ? "square__coord--dark-text"
                      : "square__coord--light-text"
                  }`}
                >
                  {FILES[f]}
                </span>
              )}
              {showRankLabel && (
                <span
                  className={`square__coord square__coord--rank ${
                    isDark
                      ? "square__coord--dark-text"
                      : "square__coord--light-text"
                  }`}
                >
                  {r + 1}
                </span>
              )}
              {piece && <Piece color={piece.color} type={piece.type} />}
              {isTarget && !isCapture && <span className="square__hint" />}
              {isCapture && <span className="square__capture-ring" />}
            </button>
          );
        }),
      )}
    </div>
  );
}

export const Board = memo(BoardImpl);
