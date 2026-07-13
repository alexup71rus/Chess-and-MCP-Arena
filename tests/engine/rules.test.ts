// Тесты терминальных состояний: шах/мат/пат и ничьи.

import { describe, expect, it } from "vitest";
import {
  gameStatus,
  generateLegalMoves,
  parseFEN,
  positionKey,
} from "@/engine";
import type { Position } from "@/engine/types";
import { pos } from "./_helpers";

// История ключей позиций для правила троекратного повторения.
// В реальной игре накапливается движком; здесь задаём вручную.
function historyWith(pos: Position, repeats: number): string[] {
  const key = positionKey(pos);
  return Array.from({ length: repeats }, () => key);
}

describe("мат и пат", () => {
  it("детский мат (Fool's mate) — мат белым", () => {
    // 1. f3 e5 2. g4 Qh4# — позиция ПОСЛЕ хода Qh4#.
    const p = pos(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    );
    const status = gameStatus(p, []);
    expect(status.kind).toBe("checkmate");
    if (status.kind === "checkmate") expect(status.winner).toBe("b");
  });

  it("детский мат (Scholar's mate) — мат чёрным за 4 хода", () => {
    const p = pos(
      "r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    );
    const status = gameStatus(p, []);
    expect(status.kind).toBe("checkmate");
  });

  it("пат — ничья", () => {
    // Чёрный король a8, белый король a6, белая ладья c7 отрезает 7-ю горизонталь
    // и держит b8 под боем? Нет — c7 бьёт b7/a7 по 7-й, но b8 свободен.
    // Надёжный пат: король h8, белый ферзь g7 (не дающий хода), король g6 —
    // но проще классика: король a1, белый король c2, ферзь b3.
    // Поле a2 под боем ферзя b3, b1 — королём c2 и ферзём, b2 — ферзём. a1 без хода.
    const p = pos("8/8/8/8/8/1Q6/2K5/k7 b - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("stalemate");
  });

  it("мат Qg7# при поддержке короля", () => {
    // Чёрный король g8 зажат в углу. Белый ферзь на g7 (соседнее поле) даёт шах;
    // белый король h6 защищает ферзя, поэтому чёрный король не может его взять.
    // Все поля отступления (f8, h8, f7, h7) под боем ферзя g7.
    // FEN 7-го ранга '5Kp'? нет: король h6 на 6-м ранге. 7-й ранг: ферзь g7.
    //   8: ......k  -> "6k1"      (g8 = король)
    //   7: ......Q. -> "6Q1"      (g7 = ферзь)
    //   6: .......K -> "7K"       (h6 = белый король, защищает ферзя)
    const p = pos("6k1/6Q1/7K/8/8/8/8/8 b - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("checkmate");
    if (status.kind === "checkmate") expect(status.winner).toBe("w");
  });
});

describe("ничьи", () => {
  it("правило 50 ходов (100 полуходов)", () => {
    const p = parseFEN("4k3/8/8/8/8/8/8/4K3 w - - 100 60");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("draw");
    if (status.kind === "draw") expect(status.reason).toBe("fifty-move");
  });

  it("K vs K — недостаточный материал", () => {
    const p = pos("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("draw");
    if (status.kind === "draw")
      expect(status.reason).toBe("insufficient-material");
  });

  it("KB vs K — недостаточный материал", () => {
    const p = pos("4k3/8/8/8/8/8/8/3BK3 w - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("draw");
    if (status.kind === "draw")
      expect(status.reason).toBe("insufficient-material");
  });

  it("KN vs K — недостаточный материал", () => {
    const p = pos("4k3/8/8/8/8/8/8/3NK3 w - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("draw");
    if (status.kind === "draw")
      expect(status.reason).toBe("insufficient-material");
  });

  it("два слона одного цвета полей — ничья", () => {
    // b1 (тёмная) и b8 (тёмная) — оба слона на тёмных полях.
    const p = pos("2b1k3/8/8/8/8/8/8/1B2K3 w - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("draw");
  });

  it("материал с ферзём достаточен — игра продолжается", () => {
    const p = pos("4k3/8/8/8/8/8/8/3QK3 w - - 0 1");
    const status = gameStatus(p, []);
    expect(status.kind).toBe("ongoing");
  });

  it("троекратное повторение", () => {
    const p = pos("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    // Та же позиция встретилась 3 раза.
    const status = gameStatus(p, historyWith(p, 3));
    expect(status.kind).toBe("draw");
    if (status.kind === "draw") expect(status.reason).toBe("threefold");
  });

  it("игнорирует en passant, если взятие невозможно", () => {
    const withoutEp = pos("4k3/8/8/4p3/8/8/8/4K3 w - - 0 2");
    const irrelevantEp = pos("4k3/8/8/4p3/8/8/8/4K3 w - e6 0 2");
    expect(positionKey(irrelevantEp)).toBe(positionKey(withoutEp));
  });
});

describe("генерация: счёт ходов в известных позициях", () => {
  it("из стартовой позиции 20 легальных ходов", () => {
    const p = pos("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(generateLegalMoves(p)).toHaveLength(20);
  });

  it("в матовой позиции нет легальных ходов", () => {
    const p = pos(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    );
    expect(generateLegalMoves(p)).toHaveLength(0);
  });
});
