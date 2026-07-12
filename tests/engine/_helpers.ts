// Вспомогательные функции для тестов движка.

import type { Move, Position, Square } from "@/engine/types";
import { parseFEN } from "@/engine/fen";
import { fromAlgebraic } from "@/engine/geometry";

// Алиас для краткости в тестах.
export const sq = (s: string): Square => fromAlgebraic(s);
export const pos = (fen: string): Position => parseFEN(fen);

/** Найти легальный ход from->to (и опц. promotion) среди сгенерированных. */
export function findMove(
  moves: Move[],
  from: string,
  to: string,
  promotion?: string,
): Move | undefined {
  const f = sq(from);
  const t = sq(to);
  return moves.find(
    (m) =>
      m.from === f &&
      m.to === t &&
      (promotion === undefined || m.promotion === promotion),
  );
}
