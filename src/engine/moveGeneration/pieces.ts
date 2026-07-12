// Генерация псевдолегальных ходов для отдельных фигур.
// Псевдолегальные = не учитывают, что ход может оставить своего короля под шахом.
// Фильтрация по шаху выполняется в legalMoves.ts.

import type { Board, Color, Move, PieceType, Position, Square } from "../types";
import { fileOf, makeSquare, onBoard, rankOf } from "../geometry";

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function baseMove(
  from: Square,
  to: Square,
  piece: PieceType,
  color: Color,
): Move {
  return { from, to, piece, color, flag: "normal" };
}

/** Ходы коня из `from`. */
export function knightMoves(board: Board, from: Square, color: Color): Move[] {
  const moves: Move[] = [];
  const r = rankOf(from);
  const f = fileOf(from);
  for (const [dr, df] of KNIGHT_DELTAS) {
    const nr = r + dr;
    const nf = f + df;
    if (!onBoard(nr, nf)) continue;
    const to = makeSquare(nr, nf);
    const target = board[to];
    if (target === null) {
      moves.push(baseMove(from, to, "n", color));
    } else if (target.color !== color) {
      moves.push({
        ...baseMove(from, to, "n", color),
        flag: "capture",
        captured: target.type,
      });
    }
  }
  return moves;
}

/** Ходы короля из `from` (без рокировки — она отдельный модуль). */
export function kingMovesNoCastle(
  board: Board,
  from: Square,
  color: Color,
): Move[] {
  const moves: Move[] = [];
  const r = rankOf(from);
  const f = fileOf(from);
  for (const [dr, df] of KING_DELTAS) {
    const nr = r + dr;
    const nf = f + df;
    if (!onBoard(nr, nf)) continue;
    const to = makeSquare(nr, nf);
    const target = board[to];
    if (target === null) {
      moves.push(baseMove(from, to, "k", color));
    } else if (target.color !== color) {
      moves.push({
        ...baseMove(from, to, "k", color),
        flag: "capture",
        captured: target.type,
      });
    }
  }
  return moves;
}

/** Ходы скользящей фигуры (слон/ладья/ферзь) по заданным направлениям. */
function slidingMoves(
  board: Board,
  from: Square,
  color: Color,
  piece: PieceType,
  dirs: ReadonlyArray<readonly [number, number]>,
): Move[] {
  const moves: Move[] = [];
  const r = rankOf(from);
  const f = fileOf(from);
  for (const [dr, df] of dirs) {
    let nr = r + dr;
    let nf = f + df;
    while (onBoard(nr, nf)) {
      const to = makeSquare(nr, nf);
      const target = board[to];
      if (target === null) {
        moves.push(baseMove(from, to, piece, color));
      } else {
        if (target.color !== color) {
          moves.push({
            ...baseMove(from, to, piece, color),
            flag: "capture",
            captured: target.type,
          });
        }
        break; // любая фигура блокирует луч
      }
      nr += dr;
      nf += df;
    }
  }
  return moves;
}

const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  ...BISHOP_DIRS,
  ...ROOK_DIRS,
];

export const bishopMoves = (b: Board, from: Square, c: Color) =>
  slidingMoves(b, from, c, "b", BISHOP_DIRS);
export const rookMoves = (b: Board, from: Square, c: Color) =>
  slidingMoves(b, from, c, "r", ROOK_DIRS);
export const queenMoves = (b: Board, from: Square, c: Color) =>
  slidingMoves(b, from, c, "q", QUEEN_DIRS);

/**
 * Ходы пешки из `from`: продвижение, взятия, двойной ход, взятие на проходе,
 * превращение. Все ходы пешки на последнюю горизонталь возвращаются БЕЗ указания
 * promotion — конкретная фигура превращения выбирается выше (см. pseudoLegal.ts).
 */
export function pawnMoves(pos: Position, from: Square, color: Color): Move[] {
  const moves: Move[] = [];
  const { board, enPassant } = pos;
  const r = rankOf(from);
  const f = fileOf(from);
  const dir = color === "w" ? 1 : -1; // направление хода
  const startRank = color === "w" ? 1 : 6;
  const promotionRank = color === "w" ? 7 : 0;

  // Продвижение на одну клетку вперёд.
  const oneR = r + dir;
  if (onBoard(oneR, f) && board[makeSquare(oneR, f)] === null) {
    pushPawn(moves, from, makeSquare(oneR, f), color, oneR === promotionRank);
    // Двойной ход со стартовой позиции.
    if (r === startRank) {
      const twoR = r + 2 * dir;
      if (board[makeSquare(twoR, f)] === null) {
        moves.push({
          ...baseMove(from, makeSquare(twoR, f), "p", color),
          flag: "double-pawn",
        });
      }
    }
  }

  // Взятия по диагонали.
  for (const df of [-1, 1]) {
    const nf = f + df;
    if (!onBoard(oneR, nf)) continue;
    const to = makeSquare(oneR, nf);
    const target = board[to];
    if (target !== null && target.color !== color) {
      pushPawn(moves, from, to, color, oneR === promotionRank, target.type);
    } else if (enPassant !== null && to === enPassant) {
      // Взятие на проходе: целевая клетка пуста, но совпадает с ep-квадратом.
      moves.push({
        ...baseMove(from, to, "p", color),
        flag: "en-passant",
        captured: "p",
      });
    }
  }

  return moves;
}

// Добавляет ход пешки, раскрывая превращение в 4 фигуры, если это последняя горизонталь.
function pushPawn(
  moves: Move[],
  from: Square,
  to: Square,
  color: Color,
  isPromotion: boolean,
  captured?: PieceType,
): void {
  if (isPromotion) {
    for (const promo of ["q", "r", "b", "n"] as const) {
      moves.push({
        ...baseMove(from, to, "p", color),
        flag: captured ? "capture" : "normal",
        captured,
        promotion: promo,
      });
    }
  } else {
    moves.push({
      ...baseMove(from, to, "p", color),
      flag: captured ? "capture" : "normal",
      captured,
    });
  }
}
