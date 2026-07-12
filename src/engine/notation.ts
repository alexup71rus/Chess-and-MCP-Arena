// Генерация стандартной алгебраической нотации (SAN).
// Включает: устранение неоднозначности по файлу/рангу, взятия (x), рокировку (O-O/O-O-O),
// превращение (=Q), шах (+) и мат (#).

import type { Move, PieceType, Position } from "./types";
import { generatePseudoLegalMoves } from "./moveGeneration/pseudoLegal";
import { fileOf, rankOf, toAlgebraic } from "./geometry";
import { generateLegalMoves, isInCheck } from "./legalMoves";
import { makeMove } from "./makeMove";

const PIECE_LETTER: Record<PieceType, string> = {
  p: "",
  n: "N",
  b: "B",
  r: "R",
  q: "Q",
  k: "K",
};

/**
 * Сгенерировать SAN для хода `move` в позиции `pos` (до его выполнения).
 * Корректность шаха/мата определяется по позиции после хода.
 */
export function toSAN(pos: Position, move: Move): string {
  // Рокировка.
  if (move.flag === "castle-k") return decorate(pos, move, "O-O");
  if (move.flag === "castle-q") return decorate(pos, move, "O-O-O");

  const isCapture =
    move.flag === "capture" ||
    move.flag === "en-passant" ||
    move.captured !== undefined;

  let san: string;

  if (move.piece === "p") {
    san = isCapture
      ? `${toAlgebraic(move.from)[0]}x${toAlgebraic(move.to)}`
      : toAlgebraic(move.to);
  } else {
    san =
      PIECE_LETTER[move.piece] +
      disambiguation(pos, move) +
      (isCapture ? "x" : "") +
      toAlgebraic(move.to);
  }

  // Превращение.
  if (move.promotion) {
    san += "=" + PIECE_LETTER[move.promotion];
  }

  return decorate(pos, move, san);
}

/** Устранение неоднозначности для небpawn-фигур по файлу, рангу или обоим. */
function disambiguation(pos: Position, move: Move): string {
  if (move.piece === "p") return "";

  // Все псевдолегальные ходы той же фигуры того же типа, что могут пойти на `to`.
  const candidates = generatePseudoLegalMoves(pos).filter(
    (m) =>
      m.piece === move.piece &&
      m.to === move.to &&
      m.from !== move.from &&
      pos.board[m.from]?.type === move.piece,
  );

  if (candidates.length === 0) return "";

  // Оставим только легальные альтернативы — именно они создают неоднозначность.
  const legal = candidates.filter((m) => isLegal(pos, m));
  if (legal.length === 0) return "";

  const sameFile = legal.some((m) => fileOf(m.from) === fileOf(move.from));
  const sameRank = legal.some((m) => rankOf(m.from) === rankOf(move.from));

  if (!sameFile) return toAlgebraic(move.from)[0]; // разных файлов достаточно
  if (!sameRank) return toAlgebraic(move.from)[1]; // общий файл -> ранг
  return toAlgebraic(move.from); // полная координата
}

function isLegal(pos: Position, move: Move): boolean {
  return generateLegalMoves(pos).some(
    (m) =>
      m.from === move.from &&
      m.to === move.to &&
      m.promotion === move.promotion,
  );
}

/** Добавить '+' (шах) или '#' (мат) к SAN. */
function decorate(pos: Position, move: Move, san: string): string {
  const next = makeMove(pos, move);
  const opponentSide = next.turn;
  if (isInCheck(next, opponentSide)) {
    const opponentMoves = generateLegalMoves(next);
    return san + (opponentMoves.length === 0 ? "#" : "+");
  }
  return san;
}
