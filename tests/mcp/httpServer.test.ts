import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildMcpExpressApp } from "@/mcp/httpServer";

const PROTOCOL_VERSION = "2025-03-26";
let server: Server;
let baseUrl: string;
let requestId = 0;

beforeAll(async () => {
  const app = buildMcpExpressApp("127.0.0.1");
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

interface McpClient {
  sessionId: string;
  callTool: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcPayload>;
  request: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<RpcPayload>;
  close: () => Promise<void>;
}

interface RpcPayload {
  result: {
    content?: Array<{ text: string }>;
    instructions?: string;
    isError?: boolean;
    tools?: Array<{ name: string }>;
  };
}

async function createClient(name: string): Promise<McpClient> {
  const response = await mcpRequest(undefined, "initialize", {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name, version: "1" },
  });
  expect(response.status).toBe(200);
  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("Server did not return mcp-session-id");
  parseRpcPayload(await response.text());

  await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: mcpHeaders(sessionId),
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    }),
  });

  return {
    sessionId,
    request: async (method, params = {}) => {
      const result = await mcpRequest(sessionId, method, params);
      expect(result.status).toBe(200);
      return parseRpcPayload(await result.text());
    },
    callTool: async (toolName, args = {}) => {
      const result = await mcpRequest(sessionId, "tools/call", {
        name: toolName,
        arguments: args,
      });
      expect(result.status).toBe(200);
      return parseRpcPayload(await result.text());
    },
    close: async () => {
      await fetch(`${baseUrl}/mcp`, {
        method: "DELETE",
        headers: mcpHeaders(sessionId),
      });
    },
  };
}

async function mcpRequest(
  sessionId: string | undefined,
  method: string,
  params: Record<string, unknown>,
) {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: mcpHeaders(sessionId),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method,
      params,
    }),
  });
}

function mcpHeaders(sessionId?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
    ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
  };
}

function parseRpcPayload(raw: string): RpcPayload {
  if (raw.trimStart().startsWith("{")) return JSON.parse(raw) as RpcPayload;
  const data = raw
    .split("\n")
    .find((line) => line.startsWith("data:"))
    ?.slice(5)
    .trim();
  if (!data) throw new Error(`Пустой MCP-ответ: ${raw}`);
  return JSON.parse(data) as RpcPayload;
}

async function createGame(
  mode: "human-vs-agent" | "agent-vs-agent",
  humanColor?: "w" | "b",
) {
  const response = await fetch(`${baseUrl}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, humanColor }),
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function nextSseMessage(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  buffer: { value: string },
) {
  const decoder = new TextDecoder();
  for (;;) {
    const boundary = buffer.value.indexOf("\n\n");
    if (boundary >= 0) {
      const frame = buffer.value.slice(0, boundary);
      buffer.value = buffer.value.slice(boundary + 2);
      const data = frame
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (data) return JSON.parse(data);
    }
    const chunk = await reader.read();
    if (chunk.done) throw new Error("SSE завершился до следующего события");
    buffer.value += decoder.decode(chunk.value, { stream: true });
  }
}

describe("single-session HTTP API", () => {
  it("не принимает tool calls без MCP initialize", async () => {
    const response = await mcpRequest(undefined, "tools/list", {});
    expect(response.status).toBe(400);
  });

  it("публикует новый протокол и только пять agent tools", async () => {
    await createGame("agent-vs-agent");
    const client = await createClient("protocol-test");
    const tools = await client.request("tools/list");
    expect(tools.result.tools!.map((tool) => tool.name)).toEqual([
      "join_game",
      "get_state",
      "legal_moves",
      "make_move",
      "resign",
    ]);
    const initialized = await mcpRequest(undefined, "initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "instructions-test", version: "1" },
    });
    const payload = parseRpcPayload(await initialized.text());
    expect(payload.result.instructions).toContain("join_game");
    expect(payload.result.instructions).not.toContain("gameId");
    expect(payload.result.instructions).not.toContain("as_color");
    await client.close();
  });

  it("закрепляет двух агентов за разными MCP-сессиями", async () => {
    await createGame("agent-vs-agent");
    const white = await createClient("white-agent");
    const black = await createClient("black-agent");
    const intruder = await createClient("intruder");

    expect(
      (await white.callTool("join_game", { color: "w" })).result.isError,
    ).not.toBe(true);
    expect((await black.callTool("join_game")).result.isError).not.toBe(true);
    expect(
      (await intruder.callTool("join_game", { color: "b" })).result.isError,
    ).toBe(true);

    expect(
      (await white.callTool("make_move", { move: "e4" })).result.isError,
    ).not.toBe(true);
    expect(
      (await white.callTool("make_move", { move: "d4" })).result.isError,
    ).toBe(true);
    expect(
      (await black.callTool("make_move", { move: "e5" })).result.isError,
    ).not.toBe(true);

    await white.close();
    await black.close();
    await intruder.close();
  });

  it("отделяет человеческий ход от агентской стороны", async () => {
    await createGame("human-vs-agent", "w");
    const forbidden = await fetch(`${baseUrl}/api/game/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: "b", move: "e5" }),
    });
    expect(forbidden.status).toBe(409);

    const humanMove = await fetch(`${baseUrl}/api/game/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: "w", move: "e4" }),
    });
    expect(humanMove.status).toBe(200);

    const agent = await createClient("human-opponent");
    expect((await agent.callTool("join_game")).result.isError).not.toBe(true);
    expect(
      (await agent.callTool("make_move", { move: "e5" })).result.isError,
    ).not.toBe(true);
    await agent.close();
  });

  it("обновляет единственный SSE-поток без gameId", async () => {
    await createGame("agent-vs-agent");
    const events = await fetch(`${baseUrl}/events`);
    expect(events.status).toBe(200);
    const reader = events.body!.getReader();
    const buffer = { value: "" };
    expect((await nextSseMessage(reader, buffer)).type).toBe("snapshot");

    const white = await createClient("sse-white");
    await white.callTool("join_game", { color: "w" });
    expect(
      (await nextSseMessage(reader, buffer)).snapshot.agentConnected.w,
    ).toBe(true);
    await white.callTool("make_move", { move: "e4" });
    const changed = await nextSseMessage(reader, buffer);
    expect(changed.snapshot.lastMove.san).toBe("e4");
    await reader.cancel();
    await white.close();
  });
});
