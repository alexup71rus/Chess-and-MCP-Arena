// Unicode-символы шахматных фигур для отрисовки.

import type { Color, PieceType } from "@/engine";

const WHITE: Record<PieceType, string> = {
  k: "♔",
  q: "♕",
  r: "♖",
  b: "♗",
  n: "♘",
  p: "♙",
};

const BLACK: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export function pieceGlyph(color: Color, type: PieceType): string {
  return color === "w" ? WHITE[type] : BLACK[type];
}
