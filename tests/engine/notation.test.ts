// Тесты генерации стандартной алгебраической нотации (SAN).

import { describe, expect, it } from "vitest";
import { generateLegalMoves, parseFEN, toSAN } from "@/engine";
import type { Position } from "@/engine/types";
import { pos, sq } from "./_helpers";

// Найти легальный ход from->to и вернуть его SAN.
function sanOf(
  fenOrPos: string | Position,
  from: string,
  to: string,
  promotion?: string,
): string {
  const position = typeof fenOrPos === "string" ? parseFEN(fenOrPos) : fenOrPos;
  const move = generateLegalMoves(position).find(
    (m) =>
      m.from === sq(from) &&
      m.to === sq(to) &&
      (promotion === undefined || m.promotion === promotion),
  );
  if (!move) throw new Error(`Ход ${from}->${to} не найден`);
  return toSAN(position, move);
}

describe("SAN — базовая нотация", () => {
  it("ход пешки — только поле", () => {
    expect(
      sanOf(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "e2",
        "e4",
      ),
    ).toBe("e4");
  });

  it("взятие пешки — с указанием вертикали", () => {
    expect(sanOf("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", "e4", "d5")).toBe("exd5");
  });

  it("ход фигуры с буквой", () => {
    expect(
      sanOf(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "g1",
        "f3",
      ),
    ).toBe("Nf3");
  });

  it("взятие фигурой", () => {
    expect(sanOf("4k3/8/8/3p4/8/2N5/8/4K3 w - - 0 1", "c3", "d5")).toBe("Nxd5");
  });
});

describe("SAN — рокировка", () => {
  it("короткая рокировка", () => {
    expect(
      sanOf(
        "r1bqk2r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "e1",
        "g1",
      ),
    ).toBe("O-O");
  });

  it("длинная рокировка", () => {
    expect(
      sanOf(
        "r3k2r/pppq1ppp/2n2n2/3pp3/3PP3/2N2N2/PPPQ1PPP/R3K2R w KQkq - 0 1",
        "e1",
        "c1",
      ),
    ).toBe("O-O-O");
  });
});

describe("SAN — устранение неоднозначности", () => {
  it("два коня на одну клетку — уточнение по вертикали", () => {
    // Кони b1 и f3 оба могут пойти на d2.
    expect(sanOf("4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1", "f3", "d2")).toBe("Nfd2");
  });

  it("две ладьи на одной вертикали — уточнение по рангу", () => {
    // Ладьи a1 и a5; обе могут пойти на a3. a1->a3 неоднозначно -> ранг R1a3.
    expect(sanOf("7k/8/8/8/R7/8/8/R3K3 w - - 0 1", "a1", "a3")).toBe("R1a3");
  });
});

describe("SAN — превращение", () => {
  it("превращение в ферзя без шаха", () => {
    // Чёрный король на a6 (6-й ранг = 3-я строка FEN), белый король h1.
    // Ферзь e8 никого не атакует (a6 вне линий ферзя e8).
    //   8: ....P... (пешка e7 на 7-м ранге)
    //   7: ....P... -> "4P3"
    //   6: k....... -> "k7"
    expect(sanOf("8/4P3/k7/8/8/8/8/7K w - - 0 1", "e7", "e8", "q")).toBe(
      "e8=Q",
    );
  });

  it("превращение в ферзя со шахом", () => {
    // Король на g8: ферзь e8 бьёт по 8-й горизонтали -> e8=Q+.
    expect(sanOf("6k1/4P3/8/8/8/8/8/4K3 w - - 0 1", "e7", "e8", "q")).toBe(
      "e8=Q+",
    );
  });

  it("превращение со взятием в коня", () => {
    // Конь стоит на c8 (2n1k3: a8,b8 пусто, c8=n) — пешка d7 берёт c8=N.
    expect(sanOf("2n1k3/3P4/8/8/8/8/8/4K3 w - - 0 1", "d7", "c8", "n")).toBe(
      "dxc8=N",
    );
  });
});

describe("SAN — шах и мат", () => {
  it("шах обозначается +", () => {
    // Белая ладья a1, чёрный король g8; Ra1-a8 даёт шах по 8-й горизонтали.
    const p = pos("6k1/8/8/8/8/8/8/R3K3 w - - 0 1");
    const move = generateLegalMoves(p).find(
      (m) => m.from === sq("a1") && m.to === sq("a8"),
    )!;
    expect(toSAN(p, move)).toBe("Ra8+");
  });

  it("мат обозначается #", () => {
    // Fool's mate: после 1. f3 e5 2. g4 — ход чёрных Qh4#.
    // Внимание: ферзь чёрных на d8 (символ 'q' в FEN, не пустое поле).
    const p = pos(
      "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
    );
    const move = generateLegalMoves(p).find(
      (m) => m.from === sq("d8") && m.to === sq("h4"),
    );
    expect(move).toBeDefined();
    expect(toSAN(p, move!)).toBe("Qh4#");
  });
});
