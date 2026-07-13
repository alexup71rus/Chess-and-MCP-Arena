import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server";
import {
  GameError,
  type OnlineMode,
  getGame,
  hasActiveGame,
  playHumanMove,
  releaseAgentSession,
  startGame,
  subscribe,
} from "./engineApi";

const DEFAULT_HOST = "127.0.0.1";

interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createServer>;
}

export function buildMcpExpressApp(host: string = DEFAULT_HOST): Express {
  const app: Express = createMcpExpressApp({ host });
  const sessions = new Map<string, McpSession>();

  app.get("/health", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      service: "chess-mcp",
      transport: "streamable-http",
      activeGame: hasActiveGame(),
    });
  });

  app.post("/mcp", async (request: Request, response: Response) => {
    const sessionId = request.headers["mcp-session-id"];
    try {
      if (typeof sessionId === "string") {
        const session = sessions.get(sessionId);
        if (!session) {
          sendRpcError(response, 404, -32001, "MCP session not found");
          return;
        }
        await session.transport.handleRequest(request, response, request.body);
        return;
      }

      if (!isInitializeRequest(request.body)) {
        sendRpcError(
          response,
          400,
          -32000,
          "Initialize the MCP session before calling tools",
        );
        return;
      }

      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { transport, server });
        },
      });
      transport.onclose = () => {
        const closedSessionId = transport.sessionId;
        if (closedSessionId) {
          sessions.delete(closedSessionId);
          releaseAgentSession(closedSessionId);
        }
      };
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error("[chess-mcp/http] Ошибка MCP-запроса:", error);
      if (!response.headersSent) {
        sendRpcError(response, 500, -32603, "Internal server error");
      }
    }
  });

  const existingSession = (request: Request): McpSession | null => {
    const sessionId = request.headers["mcp-session-id"];
    return typeof sessionId === "string"
      ? (sessions.get(sessionId) ?? null)
      : null;
  };

  app.get("/mcp", async (request: Request, response: Response) => {
    const session = existingSession(request);
    if (!session) {
      sendRpcError(response, 400, -32000, "Invalid or missing MCP session");
      return;
    }
    await session.transport.handleRequest(request, response);
  });

  app.delete("/mcp", async (request: Request, response: Response) => {
    const session = existingSession(request);
    if (!session) {
      sendRpcError(response, 400, -32000, "Invalid or missing MCP session");
      return;
    }
    await session.transport.handleRequest(request, response);
  });

  app.post("/api/game", (request: Request, response: Response) => {
    try {
      const mode = request.body?.mode as OnlineMode | undefined;
      if (mode !== "human-vs-agent" && mode !== "agent-vs-agent") {
        response.status(400).json({ error: "Некорректный режим игры" });
        return;
      }
      const humanColor = request.body?.humanColor;
      if (
        mode === "human-vs-agent" &&
        humanColor !== "w" &&
        humanColor !== "b"
      ) {
        response.status(400).json({ error: "Некорректный цвет человека" });
        return;
      }
      response.json(startGame({ mode, humanColor }));
    } catch (error) {
      sendGameError(response, error);
    }
  });

  app.get("/api/game", (_request: Request, response: Response) => {
    try {
      response.json(getGame());
    } catch (error) {
      sendGameError(response, error, 404);
    }
  });

  app.post("/api/game/move", (request: Request, response: Response) => {
    try {
      const { color, move, promotion } = request.body ?? {};
      if ((color !== "w" && color !== "b") || typeof move !== "string") {
        response.status(400).json({ error: "Некорректные параметры хода" });
        return;
      }
      if (
        promotion !== undefined &&
        !["q", "r", "b", "n"].includes(promotion)
      ) {
        response.status(400).json({ error: "Некорректное превращение" });
        return;
      }
      response.json(playHumanMove(color, move, promotion).snapshot);
    } catch (error) {
      sendGameError(response, error);
    }
  });

  app.get("/events", (_request: Request, response: Response) => {
    let initial;
    try {
      initial = getGame();
    } catch (error) {
      sendGameError(response, error, 404);
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    response.flushHeaders?.();
    response.write(
      `data: ${JSON.stringify({ type: "snapshot", snapshot: initial })}\n\n`,
    );

    const unsubscribe = subscribe((event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => response.write(": ping\n\n"), 25000);
    response.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return app;
}

function sendGameError(response: Response, error: unknown, status = 409): void {
  const message =
    error instanceof GameError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Неизвестная ошибка";
  response.status(status).json({ error: message });
}

function sendRpcError(
  response: Response,
  status: number,
  code: number,
  message: string,
): void {
  response.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}
