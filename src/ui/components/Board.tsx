// Доска: сетка 8×8 с координатами, подсветкой и обработкой кликов.

import { memo, useLayoutEffect, useRef } from "react";
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
const PIECE_NAME = {
  w: {
    p: "белая пешка",
    n: "белый конь",
    b: "белый слон",
    r: "белая ладья",
    q: "белый ферзь",
    k: "белый король",
  },
  b: {
    p: "чёрная пешка",
    n: "чёрный конь",
    b: "чёрный слон",
    r: "чёрная ладья",
    q: "чёрный ферзь",
    k: "чёрный король",
  },
} as const;

function BoardImpl({
  position,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  flipped,
  onSquareClick,
}: BoardProps) {
  const hasRendered = useRef(false);
  const previousMove = useRef(lastMove);
  const squareRefs = useRef(new Map<Square, HTMLButtonElement>());
  const pieceRefs = useRef(new Map<Square, HTMLSpanElement>());
  const activeAnimation = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const previous = previousMove.current;
    previousMove.current = lastMove;

    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    if (!lastMove) return;
    if (previous?.from === lastMove.from && previous.to === lastMove.to) {
      return;
    }

    const from = squareRefs.current.get(lastMove.from);
    const to = pieceRefs.current.get(lastMove.to);
    if (
      !from ||
      !to ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    activeAnimation.current?.cancel();
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const animation = to.animate(
      [
        {
          transform: `translate(${fromRect.left - toRect.left}px, ${fromRect.top - toRect.top}px)`,
        },
        { transform: "translate(0, 0)" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.2, 0.82, 0.25, 1)",
      },
    );
    activeAnimation.current = animation;
    animation.onfinish = () => {
      if (activeAnimation.current === animation) activeAnimation.current = null;
    };
  }, [lastMove, position.board]);

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
          const squareName = FILES[f] + (r + 1);
          const pieceName = piece ? PIECE_NAME[piece.color][piece.type] : null;
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
              ref={(element) => {
                if (element) squareRefs.current.set(sq, element);
                else squareRefs.current.delete(sq);
              }}
              aria-label={
                pieceName ? `${squareName}, ${pieceName}` : squareName
              }
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
              {piece && (
                <span
                  className="square__piece"
                  ref={(element) => {
                    if (element) pieceRefs.current.set(sq, element);
                    else pieceRefs.current.delete(sq);
                  }}
                >
                  <Piece color={piece.color} type={piece.type} />
                </span>
              )}
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
