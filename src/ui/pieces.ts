// Unicode-символы шахматных фигур для отрисовки.

import type { Color, PieceType } from "@/engine";

const FILLED: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export function pieceGlyph(_color: Color, type: PieceType): string {
  return FILLED[type];
}
