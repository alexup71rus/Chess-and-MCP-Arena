// Небольшой классический шахматный бот без нейросетей.
// Использует negamax с alpha-beta отсечениями и простую оценку материала/позиции.

import { fileOf, rankOf } from "./geometry";
import { hasInsufficientMaterial } from "./gameState";
import { isInCheck, generateLegalMoves } from "./legalMoves";
import { makeMove } from "./makeMove";
import type { Move, PieceType, Position } from "./types";

const DEFAULT_DEPTH = 3;
const MATE_SCORE = 100_000;
const INFINITY = 1_000_000;

const PIECE_VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export interface AlgorithmOptions {
  /** Глубина в полуходах. 3 держит интерфейс отзывчивым и уже ловит простые тактики. */
  depth?: number;
  /** Ограничение времени поиска. При исчерпании берётся лучший полностью рассчитанный ход. */
  timeLimitMs?: number;
}

interface SearchContext {
  deadline: number;
  nodes: number;
}

const SEARCH_TIMEOUT = Symbol("search-timeout");

/**
 * Выбирает лучший ход для стороны, которая сейчас ходит. Возвращает `null`,
 * если в позиции нет легальных ходов.
 */
export function chooseAlgorithmMove(
  position: Position,
  options: AlgorithmOptions = {},
): Move | null {
  const depth = Math.max(1, Math.floor(options.depth ?? DEFAULT_DEPTH));
  const moves = orderMoves(generateLegalMoves(position));
  if (moves.length === 0) return null;

  const context: SearchContext = {
    deadline:
      options.timeLimitMs && options.timeLimitMs > 0
        ? Date.now() + options.timeLimitMs
        : Number.POSITIVE_INFINITY,
    nodes: 0,
  };
  let bestMove = moves[0];

  // Итеративное углубление позволяет отдать ход даже при ограничении времени.
  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    try {
      bestMove = searchRoot(position, moves, currentDepth, context);
    } catch (error) {
      if (error !== SEARCH_TIMEOUT) throw error;
      break;
    }
  }

  return bestMove;
}

function searchRoot(
  position: Position,
  moves: Move[],
  depth: number,
  context: SearchContext,
): Move {
  let bestMove = moves[0];
  let bestScore = -INFINITY;
  let alpha = -INFINITY;

  for (const move of moves) {
    checkTimeout(context);
    const score = -negamax(
      makeMove(position, move),
      depth - 1,
      -INFINITY,
      -alpha,
      1,
      context,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}

function negamax(
  position: Position,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
): number {
  checkTimeout(context);
  const moves = generateLegalMoves(position);
  if (moves.length === 0) {
    return isInCheck(position, position.turn) ? -MATE_SCORE + ply : 0;
  }
  if (
    position.halfmoveClock >= 100 ||
    hasInsufficientMaterial(position.board)
  ) {
    return 0;
  }
  if (depth === 0) return evaluate(position);

  let bestScore = -INFINITY;
  for (const move of orderMoves(moves)) {
    const score = -negamax(
      makeMove(position, move),
      depth - 1,
      -beta,
      -alpha,
      ply + 1,
      context,
    );
    bestScore = Math.max(bestScore, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return bestScore;
}

function checkTimeout(context: SearchContext): void {
  context.nodes++;
  if ((context.nodes & 1023) === 0 && Date.now() >= context.deadline) {
    throw SEARCH_TIMEOUT;
  }
}

/** Оценка с точки зрения стороны, которой сейчас принадлежит ход. */
function evaluate(position: Position): number {
  let whiteScore = 0;
  for (let square = 0; square < 64; square++) {
    const piece = position.board[square];
    if (!piece) continue;
    const score =
      PIECE_VALUE[piece.type] +
      positionalBonus(piece.type, piece.color === "w", square);
    whiteScore += piece.color === "w" ? score : -score;
  }
  return position.turn === "w" ? whiteScore : -whiteScore;
}

function positionalBonus(
  piece: PieceType,
  isWhite: boolean,
  square: number,
): number {
  const rank = rankOf(square);
  const file = fileOf(square);
  const advance = isWhite ? rank : 7 - rank;
  const centre = 7 - Math.abs(file * 2 - 7) - Math.abs(rank * 2 - 7);

  switch (piece) {
    case "p":
      return advance * 10 + (file >= 2 && file <= 5 ? 4 : 0);
    case "n":
      return centre * 4;
    case "b":
      return centre * 2;
    case "r":
      return advance * 2;
    case "q":
      return centre;
    case "k":
      return 0;
  }
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort(
    (left, right) => moveOrderScore(right) - moveOrderScore(left),
  );
}

function moveOrderScore(move: Move): number {
  const capture = move.captured
    ? PIECE_VALUE[move.captured] * 10 - PIECE_VALUE[move.piece]
    : 0;
  const promotion = move.promotion ? PIECE_VALUE[move.promotion] : 0;
  return capture + promotion;
}
