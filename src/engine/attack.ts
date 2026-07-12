// Определение, находится ли квадрат под боем (защищается/атакуется фигурами цвета).

import type { Board, Color, Square } from "./types";
import { fileOf, makeSquare, onBoard, rankOf } from "./geometry";

// Смещения хода коня (delta rank, delta file).
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

// Смещения хода короля (и для обнаружения пешечной атаки).
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

// Направления скользящих фигур.
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

/**
 * Находится ли квадрат `sq` под боем хотя бы одной фигуры цвета `by`?
 * Используется для проверки шаха и условий рокировки.
 */
export function isSquareAttacked(board: Board, sq: Square, by: Color): boolean {
  const r = rankOf(sq);
  const f = fileOf(sq);

  // Пешки: атакуют по диагонали. Белые бьют вверх, чёрные — вниз.
  // Квадрат бьётся пешкой, стоящей на (r ± 1, f ± 1).
  const pawnRank = by === "w" ? r - 1 : r + 1; // ранг атакующей пешки
  if (pawnRank >= 0 && pawnRank < 8) {
    for (const df of [-1, 1]) {
      const nf = f + df;
      if (nf >= 0 && nf < 8) {
        const p = board[makeSquare(pawnRank, nf)];
        if (p && p.color === by && p.type === "p") return true;
      }
    }
  }

  // Конь.
  for (const [dr, df] of KNIGHT_DELTAS) {
    const nr = r + dr;
    const nf = f + df;
    if (onBoard(nr, nf)) {
      const p = board[makeSquare(nr, nf)];
      if (p && p.color === by && p.type === "n") return true;
    }
  }

  // Король (соседние клетки).
  for (const [dr, df] of KING_DELTAS) {
    const nr = r + dr;
    const nf = f + df;
    if (onBoard(nr, nf)) {
      const p = board[makeSquare(nr, nf)];
      if (p && p.color === by && p.type === "k") return true;
    }
  }

  // Слон / ферзь — по диагоналям.
  if (rayAttacked(board, r, f, by, BISHOP_DIRS, "b", "q")) return true;
  // Ладья / ферзь — по прямым.
  if (rayAttacked(board, r, f, by, ROOK_DIRS, "r", "q")) return true;

  return false;
}

function rayAttacked(
  board: Board,
  r: number,
  f: number,
  by: Color,
  dirs: ReadonlyArray<readonly [number, number]>,
  primary: "b" | "r",
  secondary: "q",
): boolean {
  for (const [dr, df] of dirs) {
    let nr = r + dr;
    let nf = f + df;
    while (onBoard(nr, nf)) {
      const p = board[makeSquare(nr, nf)];
      if (p !== null) {
        if (p.color === by && (p.type === primary || p.type === secondary)) {
          return true;
        }
        break; // фигура блокирует дальнейший луч
      }
      nr += dr;
      nf += df;
    }
  }
  return false;
}

/** Найти квадрат короля заданного цвета. Бросает, если короля нет (невалидная позиция). */
export function findKing(board: Board, color: Color): Square {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.type === "k" && p.color === color) return i;
  }
  throw new Error(`Король цвета ${color} не найден`);
}
