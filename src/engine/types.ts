// Фундаментальные типы шахматного движка.
// Доска представлена как массив из 64 элементов: index = rank * 8 + file,
// где rank 0 — первый горизонталь (белые фигуры), file 0 — вертикаль 'a'.
// a1 = 0, h1 = 7, a8 = 56, h8 = 63.

export type Color = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = number; // 0..63

export type Board = (Piece | null)[];

export interface CastlingRights {
  wK: boolean; // белые: короткая рокировка (король e1, ладья h1)
  wQ: boolean; // белые: длинная рокировка (король e1, ладья a1)
  bK: boolean; // чёрные: короткая (король e8, ладья h8)
  bQ: boolean; // чёрные: длинная (король e8, ладья a8)
}

export interface Position {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null; // целевой квадрат взятия на проходе
  halfmoveClock: number; // полуходы с последнего хода пешки или взятия (правило 50 ходов)
  fullmoveNumber: number;
}

export type MoveFlag =
  | "normal"
  | "capture" // обычное взятие фигуры
  | "double-pawn" // двойной ход пешки — создаёт цель en passant
  | "en-passant" // взятие на проходе
  | "castle-k" // короткая рокировка
  | "castle-q"; // длинная рокировка

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: Color;
  flag: MoveFlag;
  captured?: PieceType; // тип взятой фигуры (для capture и en-passant — "p")
  promotion?: PieceType; // фигура превращения (для ходов пешки на последнюю горизонталь)
}

export type DrawReason =
  | "fifty-move" // правило 50 ходов
  | "threefold" // троекратное повторение позиции
  | "insufficient-material"; // недостаточный материал

export type GameStatus =
  | { kind: "ongoing"; check: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: DrawReason };

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
