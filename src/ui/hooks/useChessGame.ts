// Хук состояния партии: связывает иммутабельный движок с React через useReducer.
// Хранит историю позиций (для отмены хода) и ключей позиций (для троекратного повторения).

import { useMemo, useReducer } from "react";
import {
  type Color,
  type GameStatus,
  type Move,
  type PieceType,
  type Position,
  type Square,
  startPosition,
  positionKey,
} from "@/engine";
import {
  findKing,
  gameStatus,
  generateLegalMovesFrom,
  isSquareAttacked,
  makeMove,
  parseFEN,
  toFEN,
  toSAN,
} from "@/engine";

/** Запись о сыгранном ходе: позиция до, сам ход, позиция после, SAN. */
export interface HistoryEntry {
  position: Position;
  move: Move;
  nextPosition: Position;
  san: string;
}

export interface ChessGameState {
  position: Position;
  history: HistoryEntry[]; // сыгранные ходы (для отмены и списка ходов)
  positionKeys: string[]; // ключи позиций с начала партии для правила повторения
  selected: Square | null; // выбранная клетка
  legalFromSelected: Move[]; // легальные ходы выбранной фигуры
  pendingPromotion: { from: Square; to: Square } | null; // ждём выбора фигуры
  flipped: boolean; // перевёрнута ли доска
  status: GameStatus;
  lastMove: { from: Square; to: Square } | null;
  customStartFen: string | null;
}

type Action =
  | { type: "select"; square: Square }
  | { type: "clear-selection" }
  | { type: "attempt-move"; to: Square }
  | { type: "promote"; piece: PieceType }
  | { type: "cancel-promotion" }
  | { type: "undo" }
  | { type: "new-game"; fen?: string }
  | { type: "flip" };

function checkSquareOfSide(position: Position, color: Color): Square | null {
  const king = findKing(position.board, color);
  const enemy: Color = color === "w" ? "b" : "w";
  return isSquareAttacked(position.board, king, enemy) ? king : null;
}

function init(fen?: string): ChessGameState {
  const position = fen ? parseFEN(fen) : startPosition();
  const keys = [positionKey(position)];
  return {
    position,
    history: [],
    positionKeys: keys,
    selected: null,
    legalFromSelected: [],
    pendingPromotion: null,
    flipped: false,
    status: gameStatus(position, keys),
    lastMove: null,
    customStartFen: fen ?? null,
  };
}

function reducer(state: ChessGameState, action: Action): ChessGameState {
  switch (action.type) {
    case "select": {
      // Нельзя выбирать фигуры, когда партия окончена.
      if (state.status.kind !== "ongoing") return state;
      const piece = state.position.board[action.square];
      // Выбор только своих фигур.
      if (piece === null || piece.color !== state.position.turn) {
        return { ...state, selected: null, legalFromSelected: [] };
      }
      const legal = generateLegalMovesFrom(state.position, action.square);
      return {
        ...state,
        selected: action.square,
        legalFromSelected: legal,
      };
    }

    case "clear-selection":
      return { ...state, selected: null, legalFromSelected: [] };

    case "attempt-move": {
      if (state.selected === null) return state;
      const matching = state.legalFromSelected.filter(
        (m) => m.to === action.to,
      );
      if (matching.length === 0) return state;
      // Если есть превращение — нужно выбрать фигуру.
      if (matching.some((m) => m.promotion)) {
        return {
          ...state,
          pendingPromotion: { from: state.selected, to: action.to },
        };
      }
      // Обычный ход.
      return applyMove(state, matching[0]);
    }

    case "promote": {
      if (state.pendingPromotion === null) return state;
      const move = state.legalFromSelected.find(
        (m) =>
          m.from === state.pendingPromotion!.from &&
          m.to === state.pendingPromotion!.to &&
          m.promotion === action.piece,
      );
      if (!move) return state;
      const next = applyMove(state, move);
      return { ...next, pendingPromotion: null };
    }

    case "cancel-promotion":
      return { ...state, pendingPromotion: null };

    case "undo": {
      if (state.history.length === 0) return state;
      const last = state.history[state.history.length - 1];
      const position = last.position;
      const history = state.history.slice(0, -1);
      const positionKeys = state.positionKeys.slice(0, -1);
      return {
        ...state,
        position,
        history,
        positionKeys,
        selected: null,
        legalFromSelected: [],
        pendingPromotion: null,
        lastMove:
          history.length > 0
            ? {
                from: history[history.length - 1].move.from,
                to: history[history.length - 1].move.to,
              }
            : null,
        status: gameStatus(position, positionKeys),
      };
    }

    case "new-game":
      return init(action.fen);

    case "flip":
      return { ...state, flipped: !state.flipped };

    default:
      return state;
  }
}

// Применяет ход и возвращает обновлённое состояние (без pendingPromotion).
function applyMove(state: ChessGameState, move: Move): ChessGameState {
  const nextPosition = makeMove(state.position, move);
  const san = toSAN(state.position, move);
  const entry: HistoryEntry = {
    position: state.position,
    move,
    nextPosition,
    san,
  };
  const history = [...state.history, entry];
  const positionKeys = [...state.positionKeys, positionKey(nextPosition)];
  return {
    ...state,
    position: nextPosition,
    history,
    positionKeys,
    selected: null,
    legalFromSelected: [],
    lastMove: { from: move.from, to: move.to },
    status: gameStatus(nextPosition, positionKeys),
  };
}

export function useChessGame(fen?: string) {
  const [state, dispatch] = useReducer(reducer, fen, init);
  const inCheckSquare = useMemo<Square | null>(
    () =>
      state.status.kind === "ongoing" && state.status.check
        ? checkSquareOfSide(state.position, state.position.turn)
        : null,
    [state.position, state.status],
  );
  const legalTargets = useMemo<Set<Square>>(
    () => new Set(state.legalFromSelected.map((m) => m.to)),
    [state.legalFromSelected],
  );
  return { state, dispatch, inCheckSquare, legalTargets };
}

// Реэкспортируем утилиты, нужные компонентам, чтобы не тянуть весь движок.
export { toFEN };
export type { Color, Move, Position, Square, GameStatus };
