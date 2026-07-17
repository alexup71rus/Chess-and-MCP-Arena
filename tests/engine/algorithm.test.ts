import { describe, expect, it } from "vitest";
import {
  chooseAlgorithmMove,
  gameStatus,
  makeMove,
  parseFEN,
  positionKey,
} from "@/engine";

describe("классический алгоритм", () => {
  it("находит мат в один ход", () => {
    const position = parseFEN("7k/5Q2/7K/8/8/8/8/8 w - - 0 1");
    const move = chooseAlgorithmMove(position);

    expect(move).not.toBeNull();
    const next = makeMove(position, move!);
    expect(
      gameStatus(next, [positionKey(position), positionKey(next)]),
    ).toEqual({
      kind: "checkmate",
      winner: "w",
    });
  });

  it("возвращает только легальный ход и не изменяет исходную позицию", () => {
    const position = parseFEN(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
    const before = positionKey(position);
    const move = chooseAlgorithmMove(position);

    expect(move).not.toBeNull();
    expect(positionKey(position)).toBe(before);
    expect(makeMove(position, move!).turn).toBe("w");
  });

  it("поддерживает глубину до пяти полуходов с ограничением времени", () => {
    const position = parseFEN(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );

    for (const options of [
      { depth: 1 },
      { depth: 3 },
      { depth: 5, timeLimitMs: 10 },
    ]) {
      expect(chooseAlgorithmMove(position, options)).not.toBeNull();
    }
  });
});
