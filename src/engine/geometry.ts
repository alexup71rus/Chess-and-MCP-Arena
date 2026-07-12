// Геометрия доски и утилиты для работы с индексами/координатами.

export const RANKS = 8;
export const FILES = 8;
export const SQUARES = 64;

/** Создать индекс из ранга и вертикали. */
export function makeSquare(rank: number, file: number): number {
  return rank * 8 + file;
}

/** Ранга (0..7) индекса квадрата. */
export function rankOf(sq: number): number {
  return Math.floor(sq / 8);
}

/** Вертикаль (0..7) индекса квадрата. */
export function fileOf(sq: number): number {
  return sq % 8;
}

/** Квадрат внутри доски? */
export function onBoard(rank: number, file: number): boolean {
  return rank >= 0 && rank < 8 && file >= 0 && file < 8;
}

/** Превратить индекс в алгебраическую нотацию: 0 -> "a1". */
export function toAlgebraic(sq: number): string {
  return `${"abcdefgh"[fileOf(sq)]}${rankOf(sq) + 1}`;
}

/** Превратить алгебраическую нотацию в индекс: "a1" -> 0. Бросает при некорректном вводе. */
export function fromAlgebraic(s: string): number {
  if (s.length !== 2 || s[0] < "a" || s[0] > "h" || s[1] < "1" || s[1] > "8") {
    throw new Error(`Некорректный квадрат: ${s}`);
  }
  return makeSquare(Number(s[1]) - 1, s.charCodeAt(0) - "a".charCodeAt(0));
}
