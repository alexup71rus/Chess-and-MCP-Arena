// Тесты специальных правил: рокировка, взятие на проходе, превращение пешки.

import { describe, expect, it } from "vitest";
import {
  generateLegalMoves,
  generateLegalMovesFrom,
  isInCheck,
  makeMove,
} from "@/engine";
import { findMove, pos, sq } from "./_helpers";

describe("рокировка", () => {
  it("обе рокировки доступны в открытой позиции", () => {
    const p = pos("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e1"));
    expect(findMove(moves, "e1", "g1")).toBeDefined(); // O-O
    expect(findMove(moves, "e1", "c1")).toBeDefined(); // O-O-O
  });

  it("нельзя рокировать под шахом", () => {
    // Чёрная ладья e8 даёт шах по вертикали e (король e1). Чёрный король отведён на a8.
    const p = pos("k3r3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e1"));
    expect(findMove(moves, "e1", "g1")).toBeUndefined();
    expect(findMove(moves, "e1", "c1")).toBeUndefined();
  });

  it("нельзя рокировать через битое поле", () => {
    // f1 под боем ладьи f8.
    const p = pos("5r1k/8/8/8/8/8/8/4K2R w K - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e1"));
    expect(findMove(moves, "e1", "g1")).toBeUndefined(); // проходит через f1
  });

  it("нельзя рокировать на битое поле", () => {
    // g1 под боем ладьи g8.
    const p = pos("6rk/8/8/8/8/8/8/4K2R w K - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e1"));
    expect(findMove(moves, "e1", "g1")).toBeUndefined();
  });

  it("после короткой рокировки ладья перемещается и права снимаются", () => {
    const p = pos("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const kingMoves = generateLegalMovesFrom(p, sq("e1"));
    const oo = findMove(kingMoves, "e1", "g1")!;
    const next = makeMove(p, oo);
    expect(next.board[sq("f1")]?.type).toBe("r"); // ладья с h1 -> f1
    expect(next.board[sq("h1")]).toBeNull();
    expect(next.castling.wK).toBe(false);
    expect(next.castling.wQ).toBe(false);
  });

  it("право рокировки снимается при ходе ладьёй", () => {
    const p = pos("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const rookMoves = generateLegalMovesFrom(p, sq("a1"));
    const m = findMove(rookMoves, "a1", "a2")!;
    const next = makeMove(p, m);
    expect(next.castling.wQ).toBe(false);
    expect(next.castling.wK).toBe(true); // короткая сохранилась
  });
});

describe("взятие на проходе (en passant)", () => {
  it("двойной ход пешки создаёт цель en passant", () => {
    const p = pos("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e2"));
    const dbl = findMove(moves, "e2", "e4")!;
    const next = makeMove(p, dbl);
    expect(next.enPassant).toBe(sq("e3"));
  });

  it("пешка может взять на проходе в обе стороны", () => {
    // Чёрная пешка b4, белая только что сыграла c2-c4 (ep-цель c3). Чёрные b4xc3 ep.
    const p = pos("4k3/8/8/8/1pP5/8/8/4K3 b - c3 0 1");
    const moves = generateLegalMoves(p);
    const ep = moves.find((m) => m.from === sq("b4") && m.to === sq("c3"));
    expect(ep).toBeDefined();
    expect(ep!.flag).toBe("en-passant");
    const next = makeMove(p, ep!);
    expect(next.board[sq("c4")]).toBeNull(); // белая пешка снята
    expect(next.board[sq("c3")]?.color).toBe("b");
  });

  it("en passant недоступен, если нет цели", () => {
    const p = pos("4k3/8/8/8/1pP5/8/8/4K3 b - - 0 1");
    const moves = generateLegalMoves(p);
    expect(moves.find((m) => m.flag === "en-passant")).toBeUndefined();
  });
});

describe("превращение пешки", () => {
  it("пешка на 7-й горизонтали даёт 4 хода превращения", () => {
    // Чёрный король отведён на a8, чтобы не блокировать продвижение.
    const p = pos("k7/4P3/8/8/8/8/8/4K3 w - - 0 1");
    const moves = generateLegalMovesFrom(p, sq("e7"));
    expect(moves.filter((m) => m.to === sq("e8"))).toHaveLength(4);
    expect(moves.find((m) => m.promotion === "q")).toBeDefined();
    expect(moves.find((m) => m.promotion === "r")).toBeDefined();
    expect(moves.find((m) => m.promotion === "b")).toBeDefined();
    expect(moves.find((m) => m.promotion === "n")).toBeDefined();
  });

  it("превращение со взятием даёт варианты для каждого поля", () => {
    const p = pos("1n2k3/3P4/8/8/8/8/8/4K3 w - - 0 1");
    const moves = generateLegalMovesFrom(p, sq("d7"));
    const promotions = moves.filter((m) => m.promotion);
    // вперёд d8 (4) + взятие c8 (4) = 8 минимум.
    expect(promotions.length).toBeGreaterThanOrEqual(8);
  });
});

describe("шах и защита", () => {
  it("ход не может оставить собственного короля под шахом (pin)", () => {
    // Белый король e1, чёрная ладья e8, белый конь e2 запинтован по вертикали e —
    // конь не может уйти (откроет шах), у него 0 легальных ходов.
    const p = pos("k3r3/8/8/8/8/8/8/4KN2 w - - 0 1");
    const knightMoves = generateLegalMovesFrom(p, sq("e2"));
    expect(knightMoves).toHaveLength(0);
  });

  it("определение шаха isInCheck", () => {
    const p = pos("4k3/8/8/8/8/8/4q3/4K3 w - - 0 1");
    expect(isInCheck(p, "w")).toBe(true);
    expect(isInCheck(p, "b")).toBe(false);
  });

  it("король обязан выйти из-под шаха", () => {
    // Шах по e-вертикали от ладьи e7; единственный легальный ход — король вбок.
    const p = pos("4k3/4r3/8/8/8/8/8/4K3 w - - 0 1");
    const moves = generateLegalMoves(p);
    expect(moves.length).toBeGreaterThan(0);
    // Ни один ход не оставляет белого короля на e-вертикали под боем.
    for (const m of moves) {
      const next = makeMove(p, m);
      expect(isInCheck(next, "w")).toBe(false);
    }
  });
});
