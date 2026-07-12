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
import { fromAlgebraic, makeSquare, toAlgebraic } from "./geometry";

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
  if (parts.length < 4) {
    throw new Error(`Некорректный FEN (ожидалось ≥4 полей): ${fen}`);
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

  const enPassant: Square | null =
    epPart === "-" ? null : fromAlgebraic(epPart);

  const halfmoveClock = halfmovePart ? Number(halfmovePart) : 0;
  const fullmoveNumber = fullmovePart ? Number(fullmovePart) : 1;

  return { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber };
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
