import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Color,
  type GameStatus,
  type Move,
  type PieceType,
  type Position,
  type Square,
  findKing,
  fromAlgebraic,
  generateLegalMovesFrom,
  isSquareAttacked,
  parseFEN,
  toAlgebraic,
} from "@/engine";

export type OnlineMode = "human-vs-agent" | "agent-vs-agent";
export type PlayerSide = "human" | "agent";

export interface GameSnapshot {
  mode: OnlineMode;
  fen: string;
  turn: Color;
  status: GameStatus;
  inCheck: boolean;
  lastMove: { from: string; to: string; san: string } | null;
  moveHistory: string[];
  players: { w: PlayerSide; b: PlayerSide };
  agentConnected: { w: boolean; b: boolean };
}

interface SseMessage {
  type: "snapshot" | "started" | "changed" | "ended";
  snapshot?: GameSnapshot;
}

export async function createGame(
  mode: OnlineMode,
  humanColor: Color | null,
): Promise<GameSnapshot> {
  return requestJson<GameSnapshot>("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, humanColor }),
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    throw new Error(
      "error" in body && body.error
        ? body.error
        : `HTTP ${response.status}: ${response.statusText}`,
    );
  }
  return body as T;
}

export interface OnlineState {
  snapshot: GameSnapshot | null;
  position: Position | null;
  selected: Square | null;
  legalFromSelected: Move[];
  pendingPromotion: { from: Square; to: Square } | null;
  flipped: boolean;
  mySide: Color | null;
  connected: boolean;
  error: string | null;
  submitting: boolean;
}

const INITIAL_STATE: OnlineState = {
  snapshot: null,
  position: null,
  selected: null,
  legalFromSelected: [],
  pendingPromotion: null,
  flipped: false,
  mySide: null,
  connected: false,
  error: null,
  submitting: false,
};

export function useOnlineChessGame() {
  const [state, setState] = useState<OnlineState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);

  const applySnapshot = useCallback((snapshot: GameSnapshot) => {
    setState((previous) => {
      let position = previous.position;
      try {
        position = parseFEN(snapshot.fen);
      } catch {
        // Сервер уже валидировал FEN; сохраняем последнюю корректную позицию.
      }
      return {
        ...previous,
        snapshot,
        position,
        selected: null,
        legalFromSelected: [],
        pendingPromotion: null,
      };
    });
  }, []);

  const subscribe = useCallback(() => {
    eventSourceRef.current?.close();
    const source = new EventSource("/events");
    eventSourceRef.current = source;
    source.onopen = () =>
      setState((previous) => ({
        ...previous,
        connected: true,
        error: null,
      }));
    source.onerror = () =>
      setState((previous) => ({
        ...previous,
        connected: false,
        error: "connection-lost",
      }));
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SseMessage;
        if (message.snapshot) applySnapshot(message.snapshot);
      } catch {
        // Повреждённое единичное SSE-событие игнорируется.
      }
    };
  }, [applySnapshot]);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  const connect = useCallback(
    async (mySide: Color | null) => {
      setState((previous) => ({
        ...previous,
        mySide,
        flipped: mySide === "b",
        error: null,
      }));
      const snapshot = await requestJson<GameSnapshot>("/api/game");
      applySnapshot(snapshot);
      subscribe();
    },
    [applySnapshot, subscribe],
  );

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const canInteract = useMemo(() => {
    const snapshot = state.snapshot;
    if (!snapshot || !state.position || state.submitting || !state.mySide) {
      return false;
    }
    return (
      snapshot.status.kind === "ongoing" &&
      snapshot.players[state.mySide] === "human" &&
      snapshot.turn === state.mySide
    );
  }, [state.snapshot, state.position, state.submitting, state.mySide]);

  const submitMove = useCallback(
    async (move: Move) => {
      if (!state.mySide) return;
      setState((previous) => ({
        ...previous,
        submitting: true,
        error: null,
      }));
      const uci =
        toAlgebraic(move.from) + toAlgebraic(move.to) + (move.promotion ?? "");
      try {
        const snapshot = await requestJson<GameSnapshot>("/api/game/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            color: state.mySide,
            move: uci,
            promotion: move.promotion,
          }),
        });
        applySnapshot(snapshot);
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        setState((previous) => ({
          ...previous,
          submitting: false,
          selected: null,
          legalFromSelected: [],
          pendingPromotion: null,
        }));
      }
    },
    [applySnapshot, state.mySide],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!canInteract || !state.position) return;
      if (state.selected !== null) {
        const candidates = state.legalFromSelected.filter(
          (move) => move.to === square,
        );
        if (candidates.length > 0) {
          if (candidates.some((move) => move.promotion)) {
            setState((previous) => ({
              ...previous,
              pendingPromotion: { from: state.selected!, to: square },
            }));
          } else {
            void submitMove(candidates[0]);
          }
          return;
        }
      }

      const piece = state.position.board[square];
      if (piece?.color === state.position.turn) {
        setState((previous) => ({
          ...previous,
          selected: square,
          legalFromSelected: generateLegalMovesFrom(state.position!, square),
        }));
      } else {
        setState((previous) => ({
          ...previous,
          selected: null,
          legalFromSelected: [],
        }));
      }
    },
    [
      canInteract,
      state.position,
      state.selected,
      state.legalFromSelected,
      submitMove,
    ],
  );

  const onPromote = useCallback(
    (piece: PieceType) => {
      if (!state.pendingPromotion || !state.position) return;
      const { from, to } = state.pendingPromotion;
      const move = generateLegalMovesFrom(state.position, from).find(
        (candidate) => candidate.to === to && candidate.promotion === piece,
      );
      if (move) void submitMove(move);
    },
    [state.pendingPromotion, state.position, submitMove],
  );

  const cancelPromotion = useCallback(
    () =>
      setState((previous) => ({
        ...previous,
        pendingPromotion: null,
        selected: null,
      })),
    [],
  );

  const flip = useCallback(
    () => setState((previous) => ({ ...previous, flipped: !previous.flipped })),
    [],
  );

  const setError = useCallback(
    (error: string | null) => setState((previous) => ({ ...previous, error })),
    [],
  );

  const legalTargets = useMemo(
    () => new Set(state.legalFromSelected.map((move) => move.to)),
    [state.legalFromSelected],
  );

  const inCheckSquare = useMemo<Square | null>(() => {
    const snapshot = state.snapshot;
    const position = state.position;
    if (!snapshot || !position || !snapshot.inCheck) return null;
    const king = findKing(position.board, position.turn);
    const enemy = position.turn === "w" ? "b" : "w";
    return isSquareAttacked(position.board, king, enemy) ? king : null;
  }, [state.snapshot, state.position]);

  const lastMoveSquares = useMemo<{ from: Square; to: Square } | null>(() => {
    const lastMove = state.snapshot?.lastMove;
    return lastMove
      ? {
          from: fromAlgebraic(lastMove.from),
          to: fromAlgebraic(lastMove.to),
        }
      : null;
  }, [state.snapshot?.lastMove]);

  return {
    state,
    canInteract,
    legalTargets,
    inCheckSquare,
    lastMoveSquares,
    connect,
    disconnect,
    onSquareClick,
    onPromote,
    cancelPromotion,
    flip,
    setError,
  };
}
