// Тесты адаптера движка для MCP: разрешение ходов, сценарий партии, крайние случаи.
// Это критичный слой для агентов — ошибки здесь означают неверную игру.

import { describe, expect, it } from "vitest";
import {
  GameError,
  agentColor,
  getGame,
  joinAgent,
  listAgentLegalMoves,
  listLegalMoves,
  playAgentMove,
  playHumanMove,
  playMove,
  resignGame,
  resolveMove,
  startGame,
  undoMoves,
} from "@/mcp/engineApi";
import { parseFEN, startPosition } from "@/engine";

describe("resolveMove — стартовая позиция", () => {
  const pos = startPosition();

  it("разрешает UCI e2e4", () => {
    const m = resolveMove(pos, "e2e4");
    expect(m).toHaveLength(1);
    expect(m[0].uci).toBe("e2e4");
  });

  it("разрешает SAN e4", () => {
    const m = resolveMove(pos, "e4");
    expect(m).toHaveLength(1);
    expect(m[0].from).toBe("e2");
  });

  it("разрешает SAN Nf3", () => {
    const m = resolveMove(pos, "Nf3");
    expect(m).toHaveLength(1);
    expect(m[0].piece).toBe("n");
  });

  it("не режет 'x' как взятие (ошибка регресса UCI-фильтра)", () => {
    // UCI-регекс не должен матчить "exd5" как координаты.
    const m = resolveMove(pos, "exd5");
    expect(m).toHaveLength(0); // в стартовой позиции exd5 невозможно
  });

  it("возвращает [] для пустой строки", () => {
    expect(resolveMove(pos, "")).toHaveLength(0);
    expect(resolveMove(pos, "   ")).toHaveLength(0);
  });

  it("регистронезависим для UCI", () => {
    expect(resolveMove(pos, "E2E4")).toHaveLength(1);
  });
});

describe("resolveMove — рокировка", () => {
  // Позиция, где белые могут рокировать в обе стороны.
  const fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
  const pos = parseFEN(fen);

  it("короткая рокировка SAN O-O", () => {
    const m = resolveMove(pos, "O-O");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("castle-k");
  });

  it("короткая рокировка через ход короля UCI e1g1", () => {
    const m = resolveMove(pos, "e1g1");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("castle-k");
  });

  it("длинная рокировка SAN O-O-O и 0-0-0", () => {
    expect(resolveMove(pos, "O-O-O")).toHaveLength(1);
    expect(resolveMove(pos, "0-0-0")).toHaveLength(1);
  });

  it("длинная рокировка через e1c1", () => {
    const m = resolveMove(pos, "e1c1");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("castle-q");
  });
});

describe("resolveMove — превращение пешки", () => {
  // Белая пешка e7, поле e8 свободно (король увезён на h8), белые могут превращаться.
  const fen = "7k/4P3/8/8/8/8/8/4K3 w - - 0 1";
  const pos = parseFEN(fen);

  it("UCI с суффиксом фигуры e7e8q", () => {
    const m = resolveMove(pos, "e7e8q");
    expect(m).toHaveLength(1);
    expect(m[0].promotion).toBe("q");
  });

  it("UCI без суффикса возвращает все 4 превращения", () => {
    const m = resolveMove(pos, "e7e8");
    expect(m).toHaveLength(4);
    const promos = m.map((x) => x.promotion).sort();
    expect(promos).toEqual(["b", "n", "q", "r"]);
  });

  it("SAN e8=Q", () => {
    const m = resolveMove(pos, "e8=Q");
    expect(m).toHaveLength(1);
    expect(m[0].promotion).toBe("q");
  });

  it("UCI без фигуры неоднозначен (4 варианта превращения)", () => {
    // e7e8 без суффикса — это валидный UCI, но превращение требует указать фигуру.
    const m = resolveMove(pos, "e7e8");
    expect(m).toHaveLength(4);
  });
});

describe("resolveMove — взятие на проходе", () => {
  // Чёрная пешка на d7, белая пешка на e5; ход чёрных.
  const beforeDouble = parseFEN("7k/3p4/8/4P3/8/8/8/4K3 b - - 0 1");
  // После чёрного двойного хода d7-d5 белые могут взять на проходе e5xd6.
  const afterDouble = parseFEN("7k/8/8/3pP3/8/8/8/4K3 w - d6 0 2");

  it("регулярный контекст: чёрный ход d7d5 разрешим", () => {
    const m = resolveMove(beforeDouble, "d7d5");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("double-pawn");
  });

  it("взятие на проходе через UCI e5d6", () => {
    const m = resolveMove(afterDouble, "e5d6");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("en-passant");
  });

  it("взятие на проходе через SAN exd6", () => {
    const m = resolveMove(afterDouble, "exd6");
    expect(m).toHaveLength(1);
    expect(m[0].flag).toBe("en-passant");
  });
});

describe("единственная активная партия", () => {
  it("играет мини-сценарий без gameId", () => {
    startGame();
    const first = playMove("e4");
    expect(first.move.san).toBe("e4");
    expect(first.snapshot.turn).toBe("b");
    const second = playMove("e5");
    expect(second.snapshot.moveHistory).toEqual(["e4", "e5"]);
  });

  it("новый старт полностью заменяет предыдущую партию", () => {
    startGame();
    playMove("e4");
    const replacement = startGame({ mode: "human-vs-agent", humanColor: "b" });
    expect(replacement.moveHistory).toEqual([]);
    expect(replacement.mode).toBe("human-vs-agent");
    expect(replacement.players).toEqual({ w: "agent", b: "human" });
  });

  it("фильтрует ходы по выбранной фигуре", () => {
    startGame();
    const moves = listLegalMoves("e2");
    expect(moves.map((move) => move.to).sort()).toEqual(["e3", "e4"]);
  });

  it("возвращает стабильный snapshot текущей партии", () => {
    startGame();
    expect(getGame().fen).toBe(getGame().fen);
    expect(getGame().legalMoveCount).toBe(20);
  });
});

describe("владение сторонами", () => {
  it("в human-vs-agent агент автоматически получает оставшуюся сторону", () => {
    startGame({ mode: "human-vs-agent", humanColor: "w" });
    const joined = joinAgent("agent-session");
    expect(joined.color).toBe("b");
    expect(agentColor("agent-session")).toBe("b");
    expect(() => joinAgent("other-session", "w")).toThrow(/человеку/i);
  });

  it("человек не может ходить за агентскую сторону", () => {
    startGame({ mode: "human-vs-agent", humanColor: "b" });
    expect(() => playHumanMove("w", "e4")).toThrow(/человеку/i);
  });

  it("два агента получают разные стороны и не могут переключиться", () => {
    startGame({ mode: "agent-vs-agent" });
    expect(() => joinAgent("white-session")).toThrow(/укажите color/i);
    expect(joinAgent("white-session", "w").color).toBe("w");
    expect(joinAgent("black-session").color).toBe("b");
    expect(() => joinAgent("third-session", "b")).toThrow(/заняты/i);
    expect(() => joinAgent("white-session", "b")).toThrow(/уже играет/i);
  });

  it("агент ходит только за сторону своей MCP-сессии", () => {
    startGame({ mode: "agent-vs-agent" });
    joinAgent("white-session", "w");
    joinAgent("black-session");
    expect(playAgentMove("white-session", "e4").move.san).toBe("e4");
    expect(() => playAgentMove("white-session", "d4")).toThrow(/ход чёрных/i);
    expect(playAgentMove("black-session", "e5").move.san).toBe("e5");
  });

  it("legal_moves недоступен до join_game и не в свой ход", () => {
    startGame({ mode: "agent-vs-agent" });
    expect(() => listAgentLegalMoves("unknown", "e2")).toThrow(/join_game/i);
    joinAgent("black-session", "b");
    expect(() => listAgentLegalMoves("black-session", "e7")).toThrow(
      /ход белых/i,
    );
  });
});

describe("ходы и завершение", () => {
  it("отклоняет нелегальный ход", () => {
    startGame();
    expect(() => playMove("e2e5")).toThrow(GameError);
  });

  it("требует фигуру превращения", () => {
    startGame({ fen: "7k/4P3/8/8/8/8/8/4K3 w - - 0 1" });
    expect(() => playMove("e7e8")).toThrow(/превращени/i);
    expect(playMove("e7e8", "q").move.promotion).toBe("q");
  });

  it("внутренний undo откатывает позицию", () => {
    startGame();
    playMove("e4");
    playMove("e5");
    expect(undoMoves(1).moveHistory).toEqual(["e4"]);
  });

  it("сдача имеет отдельный статус", () => {
    startGame();
    expect(resignGame("w").status).toEqual({ kind: "resigned", winner: "b" });
  });

  it("фиксирует мат и блокирует дальнейшие ходы", () => {
    startGame();
    for (const move of ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"]) {
      playMove(move);
    }
    const mate = playMove("Qxf7");
    expect(mate.snapshot.status).toEqual({ kind: "checkmate", winner: "w" });
    expect(() => playMove("a6")).toThrow(/окончена/i);
  });
});
