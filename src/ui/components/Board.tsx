// Доска: сетка 8×8 с координатами, подсветкой и обработкой кликов.

import { memo, useEffect, useRef, useState } from "react";
import type { Piece as ChessPiece, Position, Square } from "@/engine";
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

interface MoveAnimation {
  id: number;
  from: Square;
  to: Square;
  piece: ChessPiece;
  active: boolean;
}

const MOVE_ANIMATION_FALLBACK_MS = 800;

function displayCoordinates(square: Square, flipped: boolean) {
  const file = fileOf(square);
  const rank = rankOf(square);
  return {
    file: flipped ? 7 - file : file,
    rank: flipped ? rank : 7 - rank,
  };
}

function BoardImpl({
  position,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  flipped,
  onSquareClick,
}: BoardProps) {
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimation | null>(
    null,
  );
  const hasRendered = useRef(false);
  const previousMove = useRef(lastMove);
  const animationId = useRef(0);

  useEffect(() => {
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

    const piece = position.board[lastMove.to];
    if (!piece) return;

    const id = ++animationId.current;
    setMoveAnimation({ ...lastMove, piece, id, active: false });
    // Первый кадр фиксирует фигуру на исходной клетке, второй запускает CSS-переход.
    // Без этой паузы браузер может объединить оба состояния в один кадр.
    let activationFrame: number | null = null;
    const frame = requestAnimationFrame(() => {
      activationFrame = requestAnimationFrame(() => {
        setMoveAnimation((current) =>
          current?.id === id ? { ...current, active: true } : current,
        );
      });
    });
    const timeout = window.setTimeout(() => {
      setMoveAnimation((current) => (current?.id === id ? null : current));
    }, MOVE_ANIMATION_FALLBACK_MS);

    return () => {
      cancelAnimationFrame(frame);
      if (activationFrame !== null) cancelAnimationFrame(activationFrame);
      window.clearTimeout(timeout);
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
          const isMovingTarget = moveAnimation?.to === sq;
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
            isMovingTarget && "square--moving-target",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={sq}
              type="button"
              className={classes}
              onClick={() => onSquareClick(sq)}
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
              {piece && !isMovingTarget && (
                <Piece color={piece.color} type={piece.type} />
              )}
              {isTarget && !isCapture && <span className="square__hint" />}
              {isCapture && <span className="square__capture-ring" />}
            </button>
          );
        }),
      )}
      {moveAnimation && (
        <MovingPiece
          animation={moveAnimation}
          flipped={flipped}
          onFinish={() =>
            setMoveAnimation((current) =>
              current?.id === moveAnimation.id ? null : current,
            )
          }
        />
      )}
    </div>
  );
}

function MovingPiece({
  animation,
  flipped,
  onFinish,
}: {
  animation: MoveAnimation;
  flipped: boolean;
  onFinish: () => void;
}) {
  const from = displayCoordinates(animation.from, flipped);
  const to = displayCoordinates(animation.to, flipped);
  const style = {
    left: `${to.file * 12.5}%`,
    top: `${to.rank * 12.5}%`,
    "--move-x": `${(from.file - to.file) * 100}%`,
    "--move-y": `${(from.rank - to.rank) * 100}%`,
  } as React.CSSProperties;

  return (
    <div
      className={`board__move-piece ${
        animation.active ? "board__move-piece--active" : ""
      }`}
      style={style}
      onTransitionEnd={(event) => {
        if (event.propertyName === "transform") onFinish();
      }}
      aria-hidden="true"
    >
      <Piece color={animation.piece.color} type={animation.piece.type} />
    </div>
  );
}

export const Board = memo(BoardImpl);
