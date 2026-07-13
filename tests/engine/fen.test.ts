import { describe, expect, it } from "vitest";
import { parseFEN } from "@/engine";

describe("parseFEN — валидация позиции", () => {
  it("требует ровно одного короля каждого цвета", () => {
    expect(() => parseFEN("8/8/8/8/8/8/8/4K3 w - - 0 1")).toThrow(/корол/i);
    expect(() => parseFEN("4k3/8/8/8/8/8/4K3/4K3 w - - 0 1")).toThrow(/корол/i);
  });

  it("отклоняет некорректные счётчики ходов", () => {
    expect(() => parseFEN("4k3/8/8/8/8/8/8/4K3 w - - nope 1")).toThrow(
      /полуход/i,
    );
    expect(() => parseFEN("4k3/8/8/8/8/8/8/4K3 w - - 0 0")).toThrow(
      /номер хода/i,
    );
  });

  it("проверяет фигуры для заявленных прав рокировки", () => {
    expect(() => parseFEN("4k3/8/8/8/8/8/8/4K3 w K - 0 1")).toThrow(/рокиров/i);
  });

  it("проверяет пешку за полем en passant", () => {
    expect(() => parseFEN("4k3/8/8/8/8/8/8/4K3 w - e6 0 1")).toThrow(
      /en passant/i,
    );
  });
});
