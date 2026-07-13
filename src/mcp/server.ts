import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  GameError,
  type GameSnapshot,
  type MoveView,
  agentColor,
  getGame,
  joinAgent,
  listAgentLegalMoves,
  playAgentMove,
  resignAgent,
} from "./engineApi";

const SERVER_INSTRUCTIONS = `
Пользователь создаёт единственную активную партию в веб-интерфейсе.
Сначала вызови join_game и займи предназначенную тебе сторону. Сторона закрепится
за текущей MCP-сессией; последующие инструменты сами определят, за кого ты играешь.
Перед каждым ходом обязательно: get_state → legal_moves для конкретного поля from →
make_move. Не ходи, если партия окончена или сейчас очередь соперника. После своего
хода остановись и жди. Не пытайся создавать, сбрасывать или откатывать партию.
`.trim();

function describeStatus(status: GameSnapshot["status"]): string {
  switch (status.kind) {
    case "ongoing":
      return status.check ? "идёт, шах" : "идёт";
    case "checkmate":
      return `мат — победа ${sideName(status.winner)}`;
    case "resigned":
      return `сдача — победа ${sideName(status.winner)}`;
    case "stalemate":
      return "пат — ничья";
    case "draw":
      return `ничья (${status.reason})`;
  }
}

function sideName(color: "w" | "b"): string {
  return color === "w" ? "белых" : "чёрных";
}

export function snapshotToText(
  snapshot: GameSnapshot,
  justMoved?: MoveView,
): string {
  const lines: string[] = [];
  if (justMoved) {
    lines.push(
      `Ход сделан: ${justMoved.san} (${justMoved.from}→${justMoved.to})` +
        (justMoved.isCheckmate
          ? " — МАТ!"
          : justMoved.isCheck
            ? " — шах."
            : justMoved.isCapture
              ? " — взятие."
              : "."),
    );
  }
  lines.push(
    `Режим: ${snapshot.mode === "human-vs-agent" ? "человек против агента" : "агент против агента"}`,
  );
  lines.push(`FEN: ${snapshot.fen}`);
  lines.push(
    `Очередь: ${sideName(snapshot.turn)} | ход №${snapshot.moveNumber} | ` +
      `легальных ходов: ${snapshot.legalMoveCount}`,
  );
  if (snapshot.inCheck) lines.push(`⚠ Шах у ${sideName(snapshot.turn)}!`);
  lines.push(`Статус: ${describeStatus(snapshot.status)}`);
  lines.push(
    `Белые: ${snapshot.players.w}${snapshot.players.w === "agent" ? agentState(snapshot.agentConnected.w) : ""} | ` +
      `Чёрные: ${snapshot.players.b}${snapshot.players.b === "agent" ? agentState(snapshot.agentConnected.b) : ""}`,
  );
  if (snapshot.lastMove) lines.push(`Последний ход: ${snapshot.lastMove.san}`);
  if (snapshot.moveHistory.length > 0) {
    lines.push(`История: ${snapshot.moveHistory.join(" ")}`);
  }
  lines.push("", "Доска:", snapshot.board.ascii);
  return lines.join("\n");
}

function agentState(connected: boolean): string {
  return connected ? " (подключён)" : " (ожидается)";
}

function ok(snapshot: GameSnapshot, prefix?: string, move?: MoveView) {
  return {
    content: [
      {
        type: "text" as const,
        text: (prefix ? `${prefix}\n\n` : "") + snapshotToText(snapshot, move),
      },
    ],
  };
}

function fail(error: unknown) {
  const message =
    error instanceof GameError
      ? error.message
      : error instanceof Error
        ? `Внутренняя ошибка: ${error.message}`
        : "Неизвестная ошибка.";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function requireSession(extra: { sessionId?: string }): string {
  if (!extra.sessionId) {
    throw new GameError("MCP-сессия не инициализирована.");
  }
  return extra.sessionId;
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "chess", version: "2.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.tool(
    "join_game",
    "Занять агентскую сторону в единственной активной партии. В режиме " +
      "человек-против-агента свободная сторона определяется автоматически. " +
      "Если обе стороны агентские и свободны, первый агент указывает color; " +
      "второй получает оставшуюся сторону автоматически.",
    {
      color: z
        .enum(["w", "b"])
        .optional()
        .describe("Желаемый цвет, если обе агентские стороны ещё свободны."),
    },
    (args, extra) => {
      try {
        const joined = joinAgent(requireSession(extra), args.color);
        return ok(
          joined.snapshot,
          `Вы закреплены за ${sideName(joined.color)}.`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "get_state",
    "Получить состояние единственной активной партии: режим, позицию, очередь, " +
      "статус, историю и подключение сторон.",
    {},
    (_args, extra) => {
      try {
        const snapshot = getGame();
        let prefix = "Вы ещё не заняли сторону. Вызовите join_game.";
        try {
          prefix = `Ваша сторона: ${sideName(agentColor(requireSession(extra)))}.`;
        } catch {
          // Наблюдать состояние можно до join_game.
        }
        return ok(snapshot, prefix);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "legal_moves",
    "Показать легальные ходы выбранной фигуры текущего агента. Вызывается после " +
      "get_state и до make_move.",
    {
      from: z.string().describe("Поле выбранной фигуры, например 'e2'."),
    },
    (args, extra) => {
      try {
        const moves = listAgentLegalMoves(requireSession(extra), args.from);
        if (moves.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `С поля ${args.from} нет легальных ходов. Выберите другую фигуру.`,
              },
            ],
          };
        }
        const rows = moves.map(
          (move) =>
            `${move.san.padEnd(8)} (uci: ${move.uci}, ${move.from}→${move.to})` +
            (move.isCapture ? " [взятие]" : "") +
            (move.isCheck ? " [шах]" : ""),
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Легальных ходов: ${moves.length}.\n${rows.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "make_move",
    "Сделать ход за сторону, закреплённую за текущей MCP-сессией. Принимает " +
      "UCI или SAN. Перед вызовом обязательны get_state и legal_moves.",
    {
      move: z.string().describe("Ход в UCI или SAN."),
      promotion: z.enum(["q", "r", "b", "n"]).optional(),
    },
    (args, extra) => {
      try {
        const result = playAgentMove(
          requireSession(extra),
          args.move,
          args.promotion,
        );
        return ok(result.snapshot, undefined, result.move);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "resign",
    "Сдаться за сторону, закреплённую за текущей MCP-сессией.",
    {},
    (_args, extra) => {
      try {
        const color = agentColor(requireSession(extra));
        const snapshot = resignAgent(requireSession(extra));
        return ok(snapshot, `${sideName(color)} сдались.`);
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}
