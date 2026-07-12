// Генерация ходов рокировки.
// Условия для рокировки (все должны выполняться):
//   1. Право рокировки сохранено (король и соответствующая ладья не ходили).
//   2. Между королём и ладьей нет фигур.
//   3. Король не под шахом.
//   4. Поле, через которое проходит король (и конечное), не под боем.
//   5. На конечных полях стоит своя ладья правильного типа.
// Фильтр "не оставлять короля под шахом" также применяется в legalMoves.ts,
// но условия 3-4 проверяем здесь явно.

import type { Color, Move, Position, Square } from "../types";
import { isSquareAttacked } from "../attack";
import { makeSquare } from "../geometry";

// Базовые квадраты для рокировки.
const KING_FROM = { w: 4, b: 60 } as const; // e1=4, e8=60

interface CastlePlan {
  flag: "castle-k" | "castle-q";
  right: boolean; // право рокировки в позиции
  rookFrom: Square;
  // поля, которые должны быть пусты между королём и ладьёй (исключая сами фигуры)
  emptySquares: Square[];
  // поля, через которые и на которые встаёт король — не должны быть под боем
  kingPath: Square[]; // включает промежуточное и конечное (но не начальное)
}

function plansFor(color: Color): {
  kingside: CastlePlan;
  queenside: CastlePlan;
} {
  if (color === "w") {
    // e1=4, h1=7, a1=0
    return {
      kingside: {
        flag: "castle-k",
        right: false, // выставляется вызывающим кодом
        rookFrom: 7,
        emptySquares: [5, 6], // f1, g1
        kingPath: [5, 6], // f1, g1 (король не под боем на e1 проверяется отдельно)
      },
      queenside: {
        flag: "castle-q",
        right: false,
        rookFrom: 0,
        emptySquares: [1, 2, 3], // b1, c1, d1
        kingPath: [3, 2], // d1, c1
      },
    };
  }
  // e8=60, h8=63, a8=56
  return {
    kingside: {
      flag: "castle-k",
      right: false,
      rookFrom: 63,
      emptySquares: [61, 62], // f8, g8
      kingPath: [61, 62], // f8, g8
    },
    queenside: {
      flag: "castle-q",
      right: false,
      rookFrom: 56,
      emptySquares: [57, 58, 59], // b8, c8, d8
      kingPath: [59, 58], // d8, c8
    },
  };
}

/** Ходы рокировки для текущего хода стороны `color`. */
export function castlingMoves(pos: Position, color: Color): Move[] {
  const moves: Move[] = [];
  const kingFrom: Square = KING_FROM[color];
  const board = pos.board;

  // Король должен стоять на своём начальном поле.
  const king = board[kingFrom];
  if (!king || king.type !== "k" || king.color !== color) return moves;

  // Король не должен быть под шахом.
  const enemy: Color = color === "w" ? "b" : "w";
  if (isSquareAttacked(board, kingFrom, enemy)) return moves;

  const plans = plansFor(color);
  const candidates: CastlePlan[] = [
    {
      ...plans.kingside,
      right: color === "w" ? pos.castling.wK : pos.castling.bK,
    },
    {
      ...plans.queenside,
      right: color === "w" ? pos.castling.wQ : pos.castling.bQ,
    },
  ];

  for (const plan of candidates) {
    if (!plan.right) continue;
    // Ладья нужного цвета должна стоять на месте.
    const rook = board[plan.rookFrom];
    if (!rook || rook.type !== "r" || rook.color !== color) continue;

    // Поля между фигурами должны быть пусты.
    if (!plan.emptySquares.every((sq) => board[sq] === null)) continue;

    // Поля пути короля не должны быть под боем.
    if (plan.kingPath.every((sq) => !isSquareAttacked(board, sq, enemy))) {
      const to = plan.flag === "castle-k" ? plan.kingPath[1] : plan.kingPath[1];
      moves.push({
        from: kingFrom,
        to,
        piece: "k",
        color,
        flag: plan.flag,
      });
    }
  }

  return moves;
}

// Утилиты ниже нужны внешним модулям (makeMove) для перемещения ладьи.
export function rookMoveForCastle(
  flag: "castle-k" | "castle-q",
  color: Color,
): { from: Square; to: Square } {
  const backRank = color === "w" ? 0 : 7;
  if (flag === "castle-k") {
    // h-ладья -> f (file 5)
    return { from: makeSquare(backRank, 7), to: makeSquare(backRank, 5) };
  }
  // a-ладья -> d (file 3)
  return { from: makeSquare(backRank, 0), to: makeSquare(backRank, 3) };
}
