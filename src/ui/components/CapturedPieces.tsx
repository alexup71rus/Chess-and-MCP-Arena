// Взятые фигуры и материальный перевес.

import { useMemo } from "react";
import type { Board, Color, PieceType } from "@/engine";
import { pieceGlyph } from "../pieces";

interface CapturedPiecesProps {
  board: Board;
  side: Color; // для какой стороны показываем взятых ею фигур соперника
}

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Считает, какие фигуры каждого цвета отсутствуют на доске относительно полного набора. */
function capturedFromBoard(board: Board): {
  byWhite: PieceType[];
  byBlack: PieceType[];
} {
  const counts: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const piece of board) {
    if (piece) counts[piece.color][piece.type]++;
  }
  const initial = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const byWhite: PieceType[] = []; // белые взяли чёрных
  const byBlack: PieceType[] = [];
  // Учитываем превращения: лишних (сверх initial) фигур не считаем "взятыми".
  (["p", "n", "b", "r", "q"] as PieceType[]).forEach((t) => {
    const missingBlack = Math.max(0, initial[t] - counts.b[t]);
    const missingWhite = Math.max(0, initial[t] - counts.w[t]);
    for (let i = 0; i < missingBlack; i++) byWhite.push(t);
    for (let i = 0; i < missingWhite; i++) byBlack.push(t);
  });
  return { byWhite, byBlack };
}

export function CapturedPieces({ board, side }: CapturedPiecesProps) {
  const { captured, advantage } = useMemo(() => {
    const { byWhite, byBlack } = capturedFromBoard(board);
    const list = side === "w" ? byWhite : byBlack; // фигуры, взятые этой стороной
    // Сортировка по ценности (от дешёвых к дорогим).
    list.sort((a, b) => VALUE[a] - VALUE[b]);
    const whiteValue = byWhite.reduce((s, t) => s + VALUE[t], 0);
    const blackValue = byBlack.reduce((s, t) => s + VALUE[t], 0);
    const adv =
      side === "w" ? whiteValue - blackValue : blackValue - whiteValue;
    return { captured: list, advantage: adv };
  }, [board, side]);

  const enemy: Color = side === "w" ? "b" : "w";

  return (
    <div className="captured">
      <div className="captured__row">
        {captured.length === 0 ? (
          <span className="captured__empty">—</span>
        ) : (
          captured.map((t, i) => (
            <span
              key={i}
              className={`captured__piece captured__piece--${enemy}`}
            >
              {pieceGlyph(enemy, t)}
            </span>
          ))
        )}
        {advantage > 0 && <span className="captured__adv">+{advantage}</span>}
      </div>
    </div>
  );
}
