// Определение состояния игры: шах, мат, пат и ничьи.
// Ничьи: правило 50 ходов, троекратное повторение позиции, недостаточный материал.

import type { Board, Color, GameStatus, PieceType, Position } from "./types";
import { generateLegalMoves, isInCheck } from "./legalMoves";

/**
 * Полный статус игры.
 * @param positionHistory список FEN-ключей позиций (без номера хода и часов),
 *                        накопленный с начала партии — для правила троекратного повторения.
 *                        Должен включать текущую позицию.
 */
export function gameStatus(
  pos: Position,
  positionHistory: string[],
): GameStatus {
  const color: Color = pos.turn;
  const moves = generateLegalMoves(pos);
  const check = isInCheck(pos, color);
  const hasMoves = moves.length > 0;

  // Мат/пат имеют приоритет — но только если нет ходов.
  if (!hasMoves) {
    if (check) {
      // Мат: победила сторона, которая только что ходила.
      const winner: Color = color === "w" ? "b" : "w";
      return { kind: "checkmate", winner };
    }
    return { kind: "stalemate" };
  }

  // Ничьи по правилам (при наличии ходов):
  if (pos.halfmoveClock >= 100) {
    // 100 полуходов = 50 полных ходов
    return { kind: "draw", reason: "fifty-move" };
  }

  if (repetitionCount(positionHistory) >= 3) {
    return { kind: "draw", reason: "threefold" };
  }

  if (hasInsufficientMaterial(pos.board)) {
    return { kind: "draw", reason: "insufficient-material" };
  }

  return { kind: "ongoing", check };
}

/**
 * Ключ позиции для правила повторения. Включает расстановку, очередь хода,
 * права рокировки и целевой квадрат взятия на проходе. Не включает номера ходов.
 * Поле en passant учитывается только тогда, когда взятие на проходе реально легально.
 */
export function positionKey(pos: Position): string {
  const ep =
    pos.enPassant !== null &&
    generateLegalMoves(pos).some((move) => move.flag === "en-passant")
      ? pos.enPassant
      : "-";
  const c = pos.castling;
  const cr =
    (c.wK ? "K" : "") +
      (c.wQ ? "Q" : "") +
      (c.bK ? "k" : "") +
      (c.bQ ? "q" : "") || "-";
  const boardKey = pos.board
    .map((p) =>
      p === null ? "." : p.color === "w" ? p.type.toUpperCase() : p.type,
    )
    .join("");
  return `${boardKey}|${pos.turn}|${cr}|${ep}`;
}

/** Сколько раз последний (текущий) ключ встречается в истории. */
function repetitionCount(history: string[]): number {
  if (history.length === 0) return 0;
  const key = history[history.length - 1];
  let count = 0;
  for (const k of history) if (k === key) count++;
  return count;
}

/**
 * Недостаточный материал для мата.
 * Ничья, если ни у одной стороны нет пешек/ладей/ферзей и:
 *   - K vs K
 *   - K + лёгкая фигура vs K  (один слон ИЛИ один конь)
 *   - K + слон vs K + слон, оба слона одного цвета полей
 */
export function hasInsufficientMaterial(board: Board): boolean {
  const whitePieces = nonKingPieces(board, "w");
  const blackPieces = nonKingPieces(board, "b");

  // Любая пешка, ладья или ферзь — материал достаточен.
  const hasMajor = (ps: PieceCount[]) =>
    ps.some((p) => p.type === "p" || p.type === "r" || p.type === "q");
  if (hasMajor(whitePieces) || hasMajor(blackPieces)) return false;

  const w = whitePieces;
  const b = blackPieces;
  const wCount = w.reduce((s, p) => s + p.count, 0);
  const bCount = b.reduce((s, p) => s + p.count, 0);

  // K vs K
  if (wCount === 0 && bCount === 0) return true;

  // K + одна лёгкая фигура vs K
  if (wCount === 1 && bCount === 0) return true;
  if (bCount === 1 && wCount === 0) return true;

  // Два коня vs K — мата можно добиться только при ошибке соперника, но технически
  // это не форсированный мат. Согласно правилам FIDE большинство трактует это как
  // недостаточный материал. Однако два коня иногда могут дать мат — оставляем НЕ ничьёй
  // (соответствует поведению большинства движков для принудительного мата).
  // K+B vs K+B одноцветные слоны — ничья.
  if (wCount === 1 && bCount === 1) {
    const wp = w[0];
    const bp = b[0];
    if (wp.type === "b" && bp.type === "b") {
      // Оба слона; проверим цвет полей.
      const wBishopColor = squareColor(wp.square);
      const bBishopColor = squareColor(bp.square);
      if (wBishopColor === bBishopColor) return true;
    }
    // K+N vs K+N — теоретически мат возможен? Нет, форсированно невозможен,
    // но формально материал "достаточен" по правилам. Большинство движков
    // НЕ считают K+N vs K+N ничьёй автоматически. Оставляем играбельным.
  }

  return false;
}

interface PieceCount {
  type: PieceType;
  square: number;
  count: number;
}

function nonKingPieces(board: Board, color: Color): PieceCount[] {
  const counts: PieceCount[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.color === color && p.type !== "k") {
      const existing = counts.find((c) => c.type === p.type);
      if (existing) existing.count++;
      else counts.push({ type: p.type, square: sq, count: 1 });
    }
  }
  return counts;
}

function squareColor(sq: number): "light" | "dark" {
  const rank = Math.floor(sq / 8);
  const file = sq % 8;
  return (rank + file) % 2 === 0 ? "light" : "dark";
}
