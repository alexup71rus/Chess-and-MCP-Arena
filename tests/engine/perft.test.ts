// Perft (performance test) — золотой стандарт проверки генерации ходов.
// Считаем количество легальных ходов на глубине N и сравниваем с эталонами.
// Эталоны взяты с https://www.chessprogramming.org/Perft_Results — они проверены
// и включают все специальные правила (рокировка, en passant, превращение, шах).

import { describe, expect, it } from "vitest";
import { generateLegalMoves, makeMove, parseFEN } from "@/engine";
import type { Position } from "@/engine/types";

/** Рекурсивный подсчёт числа легальных узлов на глубине depth. */
function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(pos);
  if (depth === 1) return moves.length; // экономим вызовы makeMove на дне
  let nodes = 0;
  for (const move of moves) {
    nodes += perft(makeMove(pos, move), depth - 1);
  }
  return nodes;
}

describe("perft — стартовая позиция", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  it("depth 1 = 20", () => {
    expect(perft(parseFEN(fen), 1)).toBe(20);
  });
  it("depth 2 = 400", () => {
    expect(perft(parseFEN(fen), 2)).toBe(400);
  });
  it("depth 3 = 8902", () => {
    expect(perft(parseFEN(fen), 3)).toBe(8902);
  });
  it("depth 4 = 197281", () => {
    expect(perft(parseFEN(fen), 4)).toBe(197281);
  });
});

describe("perft — Kiwipete (позиция 2)", () => {
  // Классическая тестовая позиция с ранней рокировкой, en passant потенциалом.
  const fen =
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
  it("depth 1 = 48", () => {
    expect(perft(parseFEN(fen), 1)).toBe(48);
  });
  it("depth 2 = 2039", () => {
    expect(perft(parseFEN(fen), 2)).toBe(2039);
  });
  it("depth 3 = 97862", () => {
    expect(perft(parseFEN(fen), 3)).toBe(97862);
  });
});

describe("perft — позиция 3 (энпасс/превращение)", () => {
  const fen = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
  it("depth 1 = 14", () => {
    expect(perft(parseFEN(fen), 1)).toBe(14);
  });
  it("depth 3 = 2812", () => {
    expect(perft(parseFEN(fen), 3)).toBe(2812);
  });
  it("depth 4 = 43238", () => {
    expect(perft(parseFEN(fen), 4)).toBe(43238);
  });
});

describe("perft — позиция 4", () => {
  const fen =
    "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1";
  it("depth 1 = 6", () => {
    expect(perft(parseFEN(fen), 1)).toBe(6);
  });
  it("depth 3 = 9467", () => {
    expect(perft(parseFEN(fen), 3)).toBe(9467);
  });
});

describe("perft — позиция 5", () => {
  const fen = "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8";
  it("depth 1 = 44", () => {
    expect(perft(parseFEN(fen), 1)).toBe(44);
  });
  it("depth 3 = 62379", () => {
    expect(perft(parseFEN(fen), 3)).toBe(62379);
  });
});

describe("perft — позиция 6", () => {
  const fen =
    "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10";
  it("depth 1 = 46", () => {
    expect(perft(parseFEN(fen), 1)).toBe(46);
  });
  it("depth 3 = 89890", () => {
    expect(perft(parseFEN(fen), 3)).toBe(89890);
  });
});
