// Применение хода к позиции. Возвращает НОВУЮ позицию (иммутабельно).
// Предполагается, что ход легален; проверка легальности — в legalMoves.ts.

import type {
  Board,
  CastlingRights,
  Color,
  Move,
  Position,
  Square,
} from "./types";
import { rookMoveForCastle } from "./moveGeneration/castling";
import { fileOf, makeSquare, onBoard, rankOf } from "./geometry";

function cloneBoard(board: Board): Board {
  return board.slice();
}

function updateCastlingRights(
  rights: CastlingRights,
  move: Move,
): CastlingRights {
  const next: CastlingRights = { ...rights };
  const { color, piece, flag, from, to } = move;

  // Ход королём снимает оба права этой стороны.
  if (piece === "k") {
    if (color === "w") {
      next.wK = false;
      next.wQ = false;
    } else {
      next.bK = false;
      next.bQ = false;
    }
  }

  // Ход ладьёй со стартового поля снимает соответствующее право.
  // Также взятие ладьи противника снимает его право на эту сторону.
  const rookHome: Record<Color, { K: Square; Q: Square }> = {
    w: { K: 7, Q: 0 }, // h1, a1
    b: { K: 63, Q: 56 }, // h8, a8
  };
  if (piece === "r") {
    if (from === rookHome.w.K) next.wK = false;
    if (from === rookHome.w.Q) next.wQ = false;
    if (from === rookHome.b.K) next.bK = false;
    if (from === rookHome.b.Q) next.bQ = false;
  }
  // Если взяли ладью на её домашней клетке — право рокировки этой стороной исчезает.
  if (to === rookHome.w.K) next.wK = false;
  if (to === rookHome.w.Q) next.wQ = false;
  if (to === rookHome.b.K) next.bK = false;
  if (to === rookHome.b.Q) next.bQ = false;

  void flag; // флаг рокировки не влияет на права дополнительно
  return next;
}

/**
 * Применить ход, вернув новую позицию. Исходная позиция не меняется.
 * Список `history` (для троекратного повторения) обновляет вызывающая сторона.
 */
export function makeMove(pos: Position, move: Move): Position {
  const board = cloneBoard(pos.board);
  const { from, to, piece, color, flag, promotion } = move;

  // Снимаем фигуру с исходного поля.
  board[from] = null;

  // Взятие на проходе: битая пешка стоит НЕ на поле `to`, а рядом с исходным.
  if (flag === "en-passant") {
    const capturedPawnRank = rankOf(from);
    const capturedPawnFile = fileOf(to);
    board[makeSquare(capturedPawnRank, capturedPawnFile)] = null;
  }

  // Ставим фигуру на целевое поле (с учётом превращения).
  board[to] =
    promotion !== undefined
      ? { type: promotion, color }
      : { type: piece, color };

  // Рокировка: переместить также ладью.
  if (flag === "castle-k" || flag === "castle-q") {
    const rook = rookMoveForCastle(flag, color);
    board[rook.to] = board[rook.from];
    board[rook.from] = null;
  }

  // Целевой квадрат взятия на проходе для следующего хода.
  let enPassant: Square | null = null;
  if (flag === "double-pawn") {
    const epRank = color === "w" ? rankOf(from) + 1 : rankOf(from) - 1;
    const epFile = fileOf(from);
    if (onBoard(epRank, epFile)) {
      enPassant = makeSquare(epRank, epFile);
    }
  }

  // Часы полуходов: сброс при ходе пешки или взятии, иначе +1.
  const resetClock =
    piece === "p" || flag === "capture" || flag === "en-passant";
  const halfmoveClock = resetClock ? 0 : pos.halfmoveClock + 1;

  // Номер хода увеличивается после хода чёрных.
  const fullmoveNumber = pos.fullmoveNumber + (color === "b" ? 1 : 0);

  return {
    board,
    turn: color === "w" ? "b" : "w",
    castling: updateCastlingRights(pos.castling, move),
    enPassant,
    halfmoveClock,
    fullmoveNumber,
  };
}
