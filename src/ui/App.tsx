// Корневой компонент: экран выбора режима → локальная игра (hot-seat) или
// онлайн-игра через MCP (:5173/mcp) с real-time доской (SSE /events).

import { useCallback, useEffect, useState } from "react";
import {
  chooseAlgorithmMove,
  type Color,
  type PieceType,
  type Square,
} from "@/engine";
import { useChessGame } from "./hooks/useChessGame";
import { Board, type MoveFeedback } from "./components/Board";
import { CapturedPieces } from "./components/CapturedPieces";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { GameStatusView } from "./components/GameStatusView";
import { Icon } from "./components/Icon";
import { MoveHistory } from "./components/MoveHistory";
import { PromotionDialog } from "./components/PromotionDialog";
import { SoundToggle } from "./components/SoundToggle";
import { GameSettings } from "./components/GameSettings";
import { GameClocks } from "./components/GameClocks";
import {
  ModeSelect,
  type AlgorithmDifficulty,
  type Mode,
} from "./components/ModeSelect";
import { OnlineGame } from "./components/OnlineGame";
import { createGame } from "./hooks/useOnlineChessGame";
import { useMoveSounds } from "./hooks/useMoveSounds";
import { useChessClocks } from "./hooks/useChessClocks";
import { useGamePreferences } from "./hooks/useGamePreferences";
import { LanguageSwitcher, useI18n } from "./i18n";

type View =
  | { kind: "menu" }
  | { kind: "local" }
  | {
      kind: "algorithm";
      humanColor: Color;
      difficulty: AlgorithmDifficulty;
    }
  | {
      kind: "online";
      mode: "human-vs-agent" | "agent-vs-agent";
      humanColor: Color | null;
    };

export default function App() {
  const [view, setView] = useState<View>({ kind: "menu" });

  const onSelect = useCallback(
    async (
      mode: Mode,
      detail: {
        humanColor?: "w" | "b";
        algorithmDifficulty?: AlgorithmDifficulty;
      },
    ) => {
      if (mode === "local") {
        setView({ kind: "local" });
        return;
      }
      if (mode === "human-vs-algorithm") {
        setView({
          kind: "algorithm",
          humanColor: detail.humanColor === "b" ? "b" : "w",
          difficulty: detail.algorithmDifficulty ?? "easy",
        });
        return;
      }
      const humanColor: Color | null =
        mode === "human-vs-agent"
          ? detail.humanColor === "b"
            ? "b"
            : "w"
          : null;
      await createGame(mode, humanColor);
      setView({
        kind: "online",
        mode,
        humanColor,
      });
    },
    [],
  );

  if (view.kind === "menu") {
    return <ModeSelect onSelect={onSelect} />;
  }
  if (view.kind === "online") {
    return (
      <OnlineGame
        mode={view.mode}
        humanColor={view.humanColor}
        onExit={() => setView({ kind: "menu" })}
      />
    );
  }
  return (
    <LocalGame
      humanColor={view.kind === "algorithm" ? view.humanColor : null}
      algorithmDepth={
        view.kind === "algorithm" ? difficultyDepth(view.difficulty) : null
      }
      onExit={() => setView({ kind: "menu" })}
    />
  );
}

function difficultyDepth(difficulty: AlgorithmDifficulty): number {
  return difficulty === "easy" ? 1 : difficulty === "medium" ? 3 : 5;
}

/** Локальная hot-seat игра (как до интеграции с MCP), плюс кнопка выхода в меню. */
function LocalGame({
  onExit,
  humanColor,
  algorithmDepth,
}: {
  onExit: () => void;
  humanColor: Color | null;
  algorithmDepth: number | null;
}) {
  const { t } = useI18n();
  const { state, dispatch, inCheckSquare, legalTargets } = useChessGame();
  const algorithmColor: Color | null = humanColor
    ? humanColor === "w"
      ? "b"
      : "w"
    : null;
  const [thinking, setThinking] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"new" | "exit" | null>(
    null,
  );
  const {
    muted,
    effectsMode,
    showMoveHints,
    showTimer,
    setMuted,
    setEffectsMode,
    setShowMoveHints,
    setShowTimer,
  } = useGamePreferences();
  const { play, unlock } = useMoveSounds(!muted);
  const {
    seconds: clockSeconds,
    paused: clocksPaused,
    togglePause: toggleClocksPause,
  } = useChessClocks(
    state.position.turn,
    showTimer && state.status.kind === "ongoing",
    state.history.length === 0,
  );

  useEffect(() => {
    if (
      !algorithmColor ||
      state.status.kind !== "ongoing" ||
      state.position.turn !== algorithmColor
    ) {
      setThinking(false);
      return;
    }

    setThinking(true);
    const timer = window.setTimeout(() => {
      const move = chooseAlgorithmMove(state.position, {
        depth: algorithmDepth ?? undefined,
        timeLimitMs: algorithmDepth === 5 ? 1_000 : undefined,
      });
      if (move) dispatch({ type: "play-move", move });
      setThinking(false);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [algorithmColor, algorithmDepth, dispatch, state.position, state.status]);

  const toggleSound = useCallback(() => {
    if (muted) unlock();
    setMuted(!muted);
  }, [muted, setMuted, unlock]);

  const onMovePlayed = useCallback(
    ({ capture, check }: MoveFeedback) =>
      play(
        check ? "check" : capture ? "capture" : "move",
        effectsMode === "overdrive",
      ),
    [effectsMode, play],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (
        (humanColor !== null && state.position.turn !== humanColor) ||
        thinking
      ) {
        return;
      }
      if (state.selected !== null && legalTargets.has(square)) {
        dispatch({ type: "attempt-move", to: square });
        return;
      }
      dispatch({ type: "select", square });
    },
    [
      humanColor,
      state.position.turn,
      state.selected,
      legalTargets,
      dispatch,
      thinking,
    ],
  );

  const handlePromote = useCallback(
    (piece: PieceType) => dispatch({ type: "promote", piece }),
    [dispatch],
  );

  const handleCancelPromotion = useCallback(
    () => dispatch({ type: "cancel-promotion" }),
    [dispatch],
  );

  const turn = state.position.turn;
  const topColor: Color = state.flipped ? "w" : "b";
  const bottomColor: Color = topColor === "w" ? "b" : "w";
  const lastMoveColor = state.history[state.history.length - 1]?.move.color;
  const canUndoAlgorithmMove =
    humanColor !== null &&
    state.history.some((entry) => entry.move.color === humanColor);
  const undoAlgorithmMove = useCallback(() => {
    if (!canUndoAlgorithmMove) return;
    dispatch({
      type: "undo-plies",
      count: lastMoveColor === algorithmColor ? 2 : 1,
    });
  }, [algorithmColor, canUndoAlgorithmMove, dispatch, lastMoveColor]);

  return (
    <div className="app app--game">
      <header className="app__header">
        <div className="header-controls">
          <LanguageSwitcher />
          <SoundToggle muted={muted} onToggle={toggleSound} />
          <GameSettings
            effectsMode={effectsMode}
            showMoveHints={showMoveHints}
            showTimer={showTimer}
            onEffectsModeChange={setEffectsMode}
            onShowMoveHintsChange={setShowMoveHints}
            onShowTimerChange={setShowTimer}
          />
        </div>
        <h1 className="app__title">{t.title}</h1>
        <p className="app__subtitle">
          {humanColor === null ? t.localSubtitle : t.humanVsAlgorithm}
        </p>
      </header>

      <main
        className={`game-layout ${showTimer ? "game-layout--with-timer" : ""}`}
        aria-label={t.gameLabel}
      >
        <div className="game-layout__top-player">
          <PlayerRail
            color={topColor}
            active={topColor === turn}
            board={state.position.board}
            player={
              humanColor === null
                ? null
                : topColor === humanColor
                  ? "human"
                  : "algorithm"
            }
          />
        </div>

        <div className="game-layout__top-actions">
          <button
            type="button"
            className="btn btn--primary game-layout__new-game"
            onClick={() => setConfirmAction("new")}
          >
            {t.newGame}
          </button>
          <button
            type="button"
            className="btn icon-btn"
            aria-label={t.exitToMenu}
            onClick={() => setConfirmAction("exit")}
          >
            <Icon name="arrow-right" />
          </button>
        </div>

        <div className="app__board-wrap game-layout__board">
          <Board
            position={state.position}
            selected={state.selected}
            legalTargets={legalTargets}
            lastMove={state.lastMove}
            checkSquare={inCheckSquare}
            flipped={state.flipped}
            effectsMode={effectsMode}
            showMoveHints={showMoveHints}
            moveFeedback={
              state.history.length
                ? {
                    capture: ["capture", "en-passant"].includes(
                      state.history[state.history.length - 1].move.flag,
                    ),
                    check: /[+#]$/.test(
                      state.history[state.history.length - 1].san,
                    ),
                  }
                : null
            }
            onMovePlayed={onMovePlayed}
            onSquareClick={handleSquareClick}
          />
          {state.pendingPromotion && (
            <PromotionDialog
              color={turn}
              onSelect={handlePromote}
              onCancel={handleCancelPromotion}
            />
          )}
        </div>

        {showTimer && (
          <div className="game-layout__timer game-layout__timer--mobile">
            <GameClocks
              activeColor={turn}
              seconds={clockSeconds}
              paused={clocksPaused}
              onTogglePause={toggleClocksPause}
            />
          </div>
        )}

        <div className="game-layout__bottom-player">
          <PlayerRail
            color={bottomColor}
            active={bottomColor === turn}
            board={state.position.board}
            player={
              humanColor === null
                ? null
                : bottomColor === humanColor
                  ? "human"
                  : "algorithm"
            }
          />
        </div>

        <aside className="game-sidebar">
          <nav className="game-actions" aria-label={t.controlsLabel}>
            <button
              type="button"
              className="btn game-action"
              onClick={() => dispatch({ type: "flip" })}
            >
              <Icon name="flip" />
              {t.flipBoard}
            </button>
            {humanColor === null && (
              <button
                type="button"
                className="btn game-action"
                onClick={() => dispatch({ type: "undo" })}
                disabled={state.history.length === 0}
              >
                <Icon name="undo" />
                {t.undo}
              </button>
            )}
            {humanColor !== null && (
              <button
                type="button"
                className="btn game-action"
                onClick={undoAlgorithmMove}
                disabled={!canUndoAlgorithmMove}
              >
                <Icon name="undo" />
                {t.undo}
              </button>
            )}
          </nav>

          <GameStatusView status={state.status} turn={turn} />

          {thinking && <div className="game-notice">{t.algorithmThinking}</div>}

          <MoveHistory history={state.history} />

          {showTimer && (
            <div className="game-layout__timer game-layout__timer--desktop">
              <GameClocks
                activeColor={turn}
                seconds={clockSeconds}
                paused={clocksPaused}
                onTogglePause={toggleClocksPause}
              />
            </div>
          )}
        </aside>
      </main>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === "new" ? t.newGameTitle : t.exitTitle}
          description={
            confirmAction === "new"
              ? t.resetLocalDescription
              : t.exitLocalDescription
          }
          confirmLabel={confirmAction === "new" ? t.restart : t.exit}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "new") dispatch({ type: "new-game" });
            else onExit();
            setConfirmAction(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerRail({
  color,
  active,
  board,
  player,
}: {
  color: Color;
  active: boolean;
  board: Parameters<typeof CapturedPieces>[0]["board"];
  player: "human" | "algorithm" | null;
}) {
  const { colorName, t } = useI18n();
  const detail =
    player === "human"
      ? t.playerHuman
      : player === "algorithm"
        ? t.playerAlgorithm
        : null;
  return (
    <div className={`game-side ${active ? "game-side--active" : ""}`}>
      <span className="game-side__label">
        {colorName(color)}
        {detail ? ` · ${detail}` : ""}
      </span>
      <CapturedPieces board={board} side={color} />
    </div>
  );
}
