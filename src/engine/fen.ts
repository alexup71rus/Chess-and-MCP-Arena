// Парсинг и сериализация FEN, начальная позиция.

import {
  type Board,
  type CastlingRights,
  type Color,
  type Piece,
  type PieceType,
  type Position,
  type Square,
  STARTING_FEN,
} from "./types";
import { fromAlgebraic, makeSquare, rankOf, toAlgebraic } from "./geometry";

const FEN_PIECE: Record<string, Piece> = {
  P: { type: "p", color: "w" },
  N: { type: "n", color: "w" },
  B: { type: "b", color: "w" },
  R: { type: "r", color: "w" },
  Q: { type: "q", color: "w" },
  K: { type: "k", color: "w" },
  p: { type: "p", color: "b" },
  n: { type: "n", color: "b" },
  b: { type: "b", color: "b" },
  r: { type: "r", color: "b" },
  q: { type: "q", color: "b" },
  k: { type: "k", color: "b" },
};

export const EMPTY_CASTLING: CastlingRights = {
  wK: false,
  wQ: false,
  bK: false,
  bQ: false,
};

export function emptyBoard(): Board {
  return new Array<Piece | null>(64).fill(null);
}

/**
 * Разобрать FEN-строку в позицию.
 * @example parseFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
 */
export function parseFEN(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) {
    throw new Error(`Некорректный FEN (ожидалось 6 полей): ${fen}`);
  }
  const [
    boardPart,
    turnPart,
    castlingPart,
    epPart,
    halfmovePart,
    fullmovePart,
  ] = parts;

  // Доска: ранг 8 идёт первым в FEN.
  const board = emptyBoard();
  const ranks = boardPart.split("/");
  if (ranks.length !== 8) {
    throw new Error(`Некорректный FEN (ожидалось 8 рядов доски): ${fen}`);
  }
  for (let rank = 0; rank < 8; rank++) {
    const rankStr = ranks[rank];
    const actualRank = 7 - rank; // FEN идёт сверху вниз
    let file = 0;
    for (const ch of rankStr) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
      } else {
        const piece = FEN_PIECE[ch];
        if (!piece) {
          throw new Error(`Некорректный символ фигуры в FEN: ${ch}`);
        }
        if (file > 7) {
          throw new Error(`Некорректный FEN (ряд переполнен): ${fen}`);
        }
        board[makeSquare(actualRank, file)] = piece;
        file++;
      }
    }
    if (file !== 8) {
      throw new Error(`Некорректный FEN (ряд недозаполнен): ${fen}`);
    }
  }

  const whiteKings = board.filter(
    (piece) => piece?.type === "k" && piece.color === "w",
  ).length;
  const blackKings = board.filter(
    (piece) => piece?.type === "k" && piece.color === "b",
  ).length;
  if (whiteKings !== 1 || blackKings !== 1) {
    throw new Error(
      `Некорректный FEN (нужен ровно один король каждого цвета): ${fen}`,
    );
  }

  if (turnPart !== "w" && turnPart !== "b") {
    throw new Error(`Некорректный FEN (очередь хода): ${fen}`);
  }
  const turn: Color = turnPart;

  const castling: CastlingRights = { ...EMPTY_CASTLING };
  if (castlingPart !== "-") {
    for (const ch of castlingPart) {
      switch (ch) {
        case "K":
          castling.wK = true;
          break;
        case "Q":
          castling.wQ = true;
          break;
        case "k":
          castling.bK = true;
          break;
        case "q":
          castling.bQ = true;
          break;
        default:
          throw new Error(`Некорректный символ рокировки в FEN: ${ch}`);
      }
    }
  }

  validateCastlingPieces(board, castling, fen);

  const enPassant: Square | null =
    epPart === "-" ? null : fromAlgebraic(epPart);
  if (enPassant !== null) {
    validateEnPassant(board, turn, enPassant, fen);
  }

  if (!/^\d+$/.test(halfmovePart)) {
    throw new Error(`Некорректный FEN (счётчик полуходов): ${fen}`);
  }
  if (!/^\d+$/.test(fullmovePart)) {
    throw new Error(`Некорректный FEN (номер хода): ${fen}`);
  }
  const halfmoveClock = Number(halfmovePart);
  const fullmoveNumber = Number(fullmovePart);
  if (fullmoveNumber < 1) {
    throw new Error(`Некорректный FEN (номер хода должен быть ≥ 1): ${fen}`);
  }

  return { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber };
}

function validateCastlingPieces(
  board: Board,
  castling: CastlingRights,
  fen: string,
): void {
  const has = (square: Square, type: PieceType, color: Color) => {
    const piece = board[square];
    return piece?.type === type && piece.color === color;
  };
  const valid =
    (!castling.wK || (has(4, "k", "w") && has(7, "r", "w"))) &&
    (!castling.wQ || (has(4, "k", "w") && has(0, "r", "w"))) &&
    (!castling.bK || (has(60, "k", "b") && has(63, "r", "b"))) &&
    (!castling.bQ || (has(60, "k", "b") && has(56, "r", "b")));
  if (!valid) {
    throw new Error(`Некорректный FEN (права рокировки без фигур): ${fen}`);
  }
}

function validateEnPassant(
  board: Board,
  turn: Color,
  target: Square,
  fen: string,
): void {
  const expectedRank = turn === "w" ? 5 : 2;
  const pawnSquare = turn === "w" ? target - 8 : target + 8;
  const pawn = board[pawnSquare];
  const expectedColor: Color = turn === "w" ? "b" : "w";
  if (
    rankOf(target) !== expectedRank ||
    board[target] !== null ||
    pawn?.type !== "p" ||
    pawn.color !== expectedColor
  ) {
    throw new Error(`Некорректный FEN (поле en passant): ${fen}`);
  }
}

const PIECE_TO_FEN: Record<Color, Record<PieceType, string>> = {
  w: { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" },
  b: { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" },
};

/** Сериализовать позицию в FEN-строку. */
export function toFEN(pos: Position): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empties = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[makeSquare(rank, file)];
      if (piece === null) {
        empties++;
      } else {
        if (empties > 0) {
          row += empties;
          empties = 0;
        }
        row += PIECE_TO_FEN[piece.color][piece.type];
      }
    }
    if (empties > 0) row += empties;
    ranks.push(row);
  }

  let castling = "";
  if (pos.castling.wK) castling += "K";
  if (pos.castling.wQ) castling += "Q";
  if (pos.castling.bK) castling += "k";
  if (pos.castling.bQ) castling += "q";
  if (castling === "") castling = "-";

  return [
    ranks.join("/"),
    pos.turn,
    castling,
    pos.enPassant === null ? "-" : toAlgebraic(pos.enPassant),
    pos.halfmoveClock,
    pos.fullmoveNumber,
  ].join(" ");
}

/** Начальная позиция. */
export function startPosition(): Position {
  return parseFEN(STARTING_FEN);
}
