// Сборка всех псевдолегальных ходов для стороны, чья сейчас очередь.

import type { Color, Move, Position } from "../types";
import { castlingMoves } from "./castling";
import {
  bishopMoves,
  kingMovesNoCastle,
  knightMoves,
  pawnMoves,
  queenMoves,
  rookMoves,
} from "./pieces";

/** Все псевдолегальные ходы стороны, выполняющей ход в позиции `pos`. */
export function generatePseudoLegalMoves(pos: Position): Move[] {
  const color: Color = pos.turn;
  const { board } = pos;
  const moves: Move[] = [];

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece === null || piece.color !== color) continue;
    switch (piece.type) {
      case "p":
        moves.push(...pawnMoves(pos, sq, color));
        break;
      case "n":
        moves.push(...knightMoves(board, sq, color));
        break;
      case "b":
        moves.push(...bishopMoves(board, sq, color));
        break;
      case "r":
        moves.push(...rookMoves(board, sq, color));
        break;
      case "q":
        moves.push(...queenMoves(board, sq, color));
        break;
      case "k":
        moves.push(...kingMovesNoCastle(board, sq, color));
        moves.push(...castlingMoves(pos, color));
        break;
    }
  }

  return moves;
}

/** Псевдолегальные ходы конкретной фигуры на квадрате `from` (для UI-подсветки). */
export function generatePseudoLegalFrom(pos: Position, from: number): Move[] {
  const color = pos.turn;
  const piece = pos.board[from];
  if (piece === null || piece.color !== color) return [];
  const board = pos.board;
  switch (piece.type) {
    case "p":
      return pawnMoves(pos, from, color);
    case "n":
      return knightMoves(board, from, color);
    case "b":
      return bishopMoves(board, from, color);
    case "r":
      return rookMoves(board, from, color);
    case "q":
      return queenMoves(board, from, color);
    case "k": {
      const base = kingMovesNoCastle(board, from, color);
      const castle = castlingMoves(pos, color);
      return [...base, ...castle];
    }
  }
}
