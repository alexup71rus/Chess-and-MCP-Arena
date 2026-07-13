import {
  type Color,
  type GameStatus,
  type Move,
  type Piece,
  type PieceType,
  type Position,
  type Square,
  fromAlgebraic,
  gameStatus,
  generateLegalMoves,
  makeMove,
  parseFEN,
  positionKey,
  startPosition,
  toAlgebraic,
  toFEN,
  toSAN,
} from "@/engine";

export type OnlineMode = "human-vs-agent" | "agent-vs-agent";
export type PlayerSide = "human" | "agent";

export interface MoveView {
  uci: string;
  san: string;
  from: string;
  to: string;
  piece: PieceType;
  color: Color;
  flag: Move["flag"];
  capture?: PieceType;
  promotion?: PieceType;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

export interface PieceOnSquare {
  square: string;
  type: PieceType;
  color: Color;
}

export interface BoardView {
  ascii: string;
  pieces: PieceOnSquare[];
}

export interface GameSnapshot {
  mode: OnlineMode;
  fen: string;
  turn: Color;
  moveNumber: number;
  halfmoveClock: number;
  status: GameStatus;
  inCheck: boolean;
  legalMoveCount: number;
  lastMove: { from: string; to: string; san: string } | null;
  moveHistory: string[];
  board: BoardView;
  players: { w: PlayerSide; b: PlayerSide };
  agentConnected: { w: boolean; b: boolean };
}

interface Game {
  mode: OnlineMode;
  position: Position;
  history: { position: Position; move: Move; san: string }[];
  positionKeys: string[];
  sanHistory: string[];
  players: { w: PlayerSide; b: PlayerSide };
  agentSessions: { w: string | null; b: string | null };
  resignedBy: Color | null;
}

export type GameEvent =
  | { type: "started" | "changed"; snapshot: GameSnapshot }
  | { type: "ended"; snapshot: GameSnapshot };

type Listener = (event: GameEvent) => void;

let activeGame: Game | null = null;
const listeners = new Set<Listener>();

export class GameError extends Error {}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(type: GameEvent["type"]): void {
  if (!activeGame || listeners.size === 0) return;
  const event = { type, snapshot: snapshot(activeGame) } as GameEvent;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Один отключившийся SSE-клиент не должен ломать партию.
    }
  }
}

function ensureGame(): Game {
  if (!activeGame) {
    throw new GameError(
      "Активной партии нет. Попросите пользователя создать её в веб-интерфейсе.",
    );
  }
  return activeGame;
}

export interface StartOptions {
  mode?: OnlineMode;
  humanColor?: Color;
  fen?: string | null;
}

/** Создать единственную активную online-партию, заменив предыдущую. */
export function startGame(opts: StartOptions = {}): GameSnapshot {
  const mode = opts.mode ?? "agent-vs-agent";
  const humanColor = opts.humanColor ?? "w";
  let position: Position;
  try {
    position = opts.fen ? parseFEN(opts.fen) : startPosition();
  } catch (error) {
    throw new GameError(
      `Некорректный FEN: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const players: Game["players"] =
    mode === "agent-vs-agent"
      ? { w: "agent", b: "agent" }
      : humanColor === "w"
        ? { w: "human", b: "agent" }
        : { w: "agent", b: "human" };

  activeGame = {
    mode,
    position,
    history: [],
    positionKeys: [positionKey(position)],
    sanHistory: [],
    players,
    agentSessions: { w: null, b: null },
    resignedBy: null,
  };
  emit("started");
  return snapshot(activeGame);
}

export function getGame(): GameSnapshot {
  return snapshot(ensureGame());
}

export function hasActiveGame(): boolean {
  return activeGame !== null;
}

export interface JoinAgentResult {
  color: Color;
  snapshot: GameSnapshot;
}

/** Закрепить агентскую сторону за MCP-сессией. */
export function joinAgent(
  sessionId: string,
  requestedColor?: Color,
): JoinAgentResult {
  const game = ensureGame();
  const current = colorForSession(game, sessionId);
  if (current) {
    if (requestedColor && requestedColor !== current) {
      throw new GameError(`Эта MCP-сессия уже играет за ${sideWord(current)}.`);
    }
    return { color: current, snapshot: snapshot(game) };
  }

  const available = (["w", "b"] as const).filter(
    (color) =>
      game.players[color] === "agent" && game.agentSessions[color] === null,
  );

  let color: Color;
  if (requestedColor) {
    if (game.players[requestedColor] !== "agent") {
      throw new GameError(
        `${sideLabel(requestedColor)} назначены человеку, агент не может занять эту сторону.`,
      );
    }
    if (game.agentSessions[requestedColor] !== null) {
      throw new GameError(
        `${sideLabel(requestedColor)} уже заняты другим агентом.`,
      );
    }
    color = requestedColor;
  } else if (available.length === 1) {
    color = available[0];
  } else if (available.length === 0) {
    throw new GameError("Свободных агентских сторон в текущей партии нет.");
  } else {
    throw new GameError(
      "Обе стороны свободны. Укажите color: 'w' или 'b' при join_game.",
    );
  }

  game.agentSessions[color] = sessionId;
  emit("changed");
  return { color, snapshot: snapshot(game) };
}

/** Освободить сторону после завершения MCP-сессии. */
export function releaseAgentSession(sessionId: string): void {
  if (!activeGame) return;
  let changed = false;
  for (const color of ["w", "b"] as const) {
    if (activeGame.agentSessions[color] === sessionId) {
      activeGame.agentSessions[color] = null;
      changed = true;
    }
  }
  if (changed) emit("changed");
}

export function agentColor(sessionId: string): Color {
  const game = ensureGame();
  const color = colorForSession(game, sessionId);
  if (!color) {
    throw new GameError("Сначала займите сторону через join_game.");
  }
  return color;
}

function colorForSession(game: Game, sessionId: string): Color | null {
  if (game.agentSessions.w === sessionId) return "w";
  if (game.agentSessions.b === sessionId) return "b";
  return null;
}

export function listLegalMoves(from?: string | null): MoveView[] {
  const game = ensureGame();
  assertGameActive(game);
  const legal = generateLegalMoves(game.position);
  const filtered =
    from !== undefined && from !== null && from !== ""
      ? legal.filter(
          (move) => toAlgebraic(move.from).toLowerCase() === from.toLowerCase(),
        )
      : legal;
  return filtered.map((move) => moveToView(game.position, move));
}

export function listAgentLegalMoves(
  sessionId: string,
  from?: string | null,
): MoveView[] {
  const game = ensureGame();
  const color = agentColor(sessionId);
  if (game.position.turn !== color) {
    throw new GameError(
      `Сейчас ход ${sideWord(game.position.turn)}. Подождите соперника.`,
    );
  }
  return listLegalMoves(from);
}

export interface MakeMoveResult {
  snapshot: GameSnapshot;
  move: MoveView;
}

/** Низкоуровневый ход с явным цветом; ownership проверяют обёртки ниже. */
export function playMove(
  move: string,
  promotion?: PieceType | null,
  asColor?: Color | null,
): MakeMoveResult {
  const game = ensureGame();
  assertGameActive(game);

  if (asColor && asColor !== game.position.turn) {
    throw new GameError(
      `Сейчас ход ${sideWord(game.position.turn)}, а не ${sideWord(asColor)}.`,
    );
  }

  const matches = resolveRaw(game.position, move);
  if (matches.length === 0) {
    throw new GameError(
      `Нелегальный ход «${move}» для ${sideWord(game.position.turn)}. ` +
        "Вызовите legal_moves и выберите допустимый ход.",
    );
  }

  let chosen: Move;
  const promotions = matches.filter((candidate) => candidate.promotion);
  if (promotions.length > 0) {
    if (!promotion) {
      throw new GameError(
        `Ход «${move}» ведёт к превращению. Укажите promotion: q, r, b или n.`,
      );
    }
    const byPromotion = promotions.filter(
      (candidate) => candidate.promotion === promotion,
    );
    if (byPromotion.length === 0) {
      throw new GameError(
        `Ход «${move}» с превращением в ${promotion} нелегален.`,
      );
    }
    chosen = byPromotion[0];
  } else if (matches.length > 1) {
    const variants = matches
      .map((candidate) => toSAN(game.position, candidate))
      .join(", ");
    throw new GameError(`Ход «${move}» неоднозначен. Варианты: ${variants}.`);
  } else {
    chosen = matches[0];
  }

  const before = game.position;
  const san = toSAN(before, chosen);
  const next = makeMove(before, chosen);
  game.history.push({ position: before, move: chosen, san });
  game.sanHistory.push(san);
  game.positionKeys.push(positionKey(next));
  game.position = next;

  const moveView = moveToView(before, chosen);
  const currentSnapshot = snapshot(game);
  emit(currentSnapshot.status.kind === "ongoing" ? "changed" : "ended");
  return { snapshot: currentSnapshot, move: moveView };
}

export function playHumanMove(
  color: Color,
  move: string,
  promotion?: PieceType | null,
): MakeMoveResult {
  const game = ensureGame();
  if (game.players[color] !== "human") {
    throw new GameError(`${sideWord(color)} не назначены человеку.`);
  }
  return playMove(move, promotion, color);
}

export function playAgentMove(
  sessionId: string,
  move: string,
  promotion?: PieceType | null,
): MakeMoveResult {
  return playMove(move, promotion, agentColor(sessionId));
}

/** Откат остаётся внутренней операцией и не экспортируется как MCP tool. */
export function undoMoves(plies = 1): GameSnapshot {
  const game = ensureGame();
  const count = Math.max(0, Math.min(plies, game.history.length));
  for (let index = 0; index < count; index++) {
    const previous = game.history.pop()!;
    game.position = previous.position;
    game.positionKeys.pop();
    game.sanHistory.pop();
  }
  if (count > 0) emit("changed");
  return snapshot(game);
}

export function resignGame(byColor?: Color): GameSnapshot {
  const game = ensureGame();
  assertGameActive(game);
  game.resignedBy = byColor ?? game.position.turn;
  const currentSnapshot = snapshot(game);
  emit("ended");
  return currentSnapshot;
}

export function resignAgent(sessionId: string): GameSnapshot {
  return resignGame(agentColor(sessionId));
}

function assertGameActive(game: Game): void {
  const status = effectiveStatus(game);
  if (status.kind !== "ongoing") {
    throw new GameError(`Партия уже окончена (${describeStatus(status)}).`);
  }
}

function snapshot(game: Game): GameSnapshot {
  const status = effectiveStatus(game);
  const lastEntry = game.history[game.history.length - 1] ?? null;
  return {
    mode: game.mode,
    fen: toFEN(game.position),
    turn: game.position.turn,
    moveNumber: game.position.fullmoveNumber,
    halfmoveClock: game.position.halfmoveClock,
    status,
    inCheck: status.kind === "ongoing" ? status.check : false,
    legalMoveCount:
      status.kind === "ongoing" ? generateLegalMoves(game.position).length : 0,
    lastMove: lastEntry
      ? {
          from: toAlgebraic(lastEntry.move.from),
          to: toAlgebraic(lastEntry.move.to),
          san: lastEntry.san,
        }
      : null,
    moveHistory: [...game.sanHistory],
    board: boardView(game.position),
    players: { ...game.players },
    agentConnected: {
      w: game.agentSessions.w !== null,
      b: game.agentSessions.b !== null,
    },
  };
}

function effectiveStatus(game: Game): GameStatus {
  if (game.resignedBy) {
    return {
      kind: "resigned",
      winner: game.resignedBy === "w" ? "b" : "w",
    };
  }
  return gameStatus(game.position, game.positionKeys);
}

function describeStatus(status: GameStatus): string {
  switch (status.kind) {
    case "ongoing":
      return "партия идёт";
    case "checkmate":
      return `мат, победа ${sideWord(status.winner)}`;
    case "resigned":
      return `сдача, победа ${sideWord(status.winner)}`;
    case "stalemate":
      return "пат";
    case "draw":
      return `ничья (${status.reason})`;
  }
}

function sideWord(color: Color): string {
  return color === "w" ? "белых" : "чёрных";
}

function sideLabel(color: Color): string {
  return color === "w" ? "Белые" : "Чёрные";
}

const SAN_CASTLE = /^(o-o-o|0-0-0|o-o|0-0)$/i;
const PROMOTIONS = new Set<PieceType>(["q", "r", "b", "n"]);

function resolveRaw(position: Position, move: string): Move[] {
  const raw = move.trim();
  if (!raw) return [];
  const legal = generateLegalMoves(position);

  if (/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.test(raw)) {
    const normalized = raw.toLowerCase();
    const from = fromAlgebraic(normalized.slice(0, 2)) as Square;
    const to = fromAlgebraic(normalized.slice(2, 4)) as Square;
    const promotion = normalized[4] as PieceType | undefined;
    const candidates = legal.filter(
      (candidate) => candidate.from === from && candidate.to === to,
    );
    if (!promotion) return candidates;
    if (!PROMOTIONS.has(promotion)) return [];
    return candidates.filter((candidate) => candidate.promotion === promotion);
  }

  if (SAN_CASTLE.test(raw)) {
    const long = /o-o-o|0-0-0/i.test(raw);
    return legal.filter(
      (candidate) => candidate.flag === (long ? "castle-q" : "castle-k"),
    );
  }

  const cleaned = raw.replace(/[+#!?]/g, "");
  return legal.filter(
    (candidate) =>
      toSAN(position, candidate).replace(/[+#!?]/g, "") === cleaned,
  );
}

export function resolveMove(position: Position, move: string): MoveView[] {
  return resolveRaw(position, move).map((candidate) =>
    moveToView(position, candidate),
  );
}

function moveToView(position: Position, move: Move): MoveView {
  const next = makeMove(position, move);
  const statusAfter = gameStatus(next, [positionKey(next)]);
  const isCheckmate = statusAfter.kind === "checkmate";
  const isCheck =
    isCheckmate || (statusAfter.kind === "ongoing" && statusAfter.check);
  const isCapture =
    move.flag === "capture" ||
    move.flag === "en-passant" ||
    move.captured !== undefined;
  return {
    uci: toAlgebraic(move.from) + toAlgebraic(move.to) + (move.promotion ?? ""),
    san: toSAN(position, move),
    from: toAlgebraic(move.from),
    to: toAlgebraic(move.to),
    piece: move.piece,
    color: move.color,
    flag: move.flag,
    capture: move.captured,
    promotion: move.promotion,
    isCapture,
    isCheck,
    isCheckmate,
  };
}

const GLYPH: Record<Color, Record<PieceType, string>> = {
  w: { k: "K", q: "Q", r: "R", b: "B", n: "N", p: "P" },
  b: { k: "k", q: "q", r: "r", b: "b", n: "n", p: "p" },
};

function boardView(position: Position): BoardView {
  const lines = ["  a b c d e f g h"];
  for (let rank = 7; rank >= 0; rank--) {
    let row = `${rank + 1} `;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank * 8 + file];
      row += piece ? `${GLYPH[piece.color][piece.type]} ` : ". ";
    }
    lines.push(`${row.trimEnd()} ${rank + 1}`);
  }
  lines.push("  a b c d e f g h");

  const pieces: PieceOnSquare[] = [];
  for (let square = 0; square < 64; square++) {
    const piece = position.board[square] as Piece | null;
    if (piece) {
      pieces.push({
        square: toAlgebraic(square),
        type: piece.type,
        color: piece.color,
      });
    }
  }
  return { ascii: lines.join("\n"), pieces };
}
