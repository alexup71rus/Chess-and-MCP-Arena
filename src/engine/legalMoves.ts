// Фильтрация псевдолегальных ходов: ход легален, если после него
// собственный король не оказывается под боем.

import type { Move, Position, Square } from "./types";
import { isSquareAttacked, findKing } from "./attack";
import {
  generatePseudoLegalFrom,
  generatePseudoLegalMoves,
} from "./moveGeneration/pseudoLegal";
import { makeMove } from "./makeMove";

/** Лежит ли король цвета `color` под шахом в позиции `pos`? */
export function isInCheck(pos: Position, color: "w" | "b"): boolean {
  const king = findKing(pos.board, color);
  const enemy: "w" | "b" = color === "w" ? "b" : "w";
  return isSquareAttacked(pos.board, king, enemy);
}

/** Все легальные ходы в позиции `pos`. */
export function generateLegalMoves(pos: Position): Move[] {
  const pseudo = generatePseudoLegalMoves(pos);
  const color = pos.turn;
  const enemy: "w" | "b" = color === "w" ? "b" : "w";
  const legal: Move[] = [];
  for (const move of pseudo) {
    const next = makeMove(pos, move);
    const king = findKing(next.board, color);
    if (!isSquareAttacked(next.board, king, enemy)) {
      legal.push(move);
    }
  }
  return legal;
}

/** Легальные ходы фигуры с поля `from` (для UI: подсветка после выбора фигуры). */
export function generateLegalMovesFrom(pos: Position, from: Square): Move[] {
  const pseudo = generatePseudoLegalFrom(pos, from);
  const color = pos.turn;
  const enemy: "w" | "b" = color === "w" ? "b" : "w";
  const legal: Move[] = [];
  for (const move of pseudo) {
    const next = makeMove(pos, move);
    const king = findKing(next.board, color);
    if (!isSquareAttacked(next.board, king, enemy)) {
      legal.push(move);
    }
  }
  return legal;
}
