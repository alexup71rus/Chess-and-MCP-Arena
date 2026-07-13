// Доска: сетка 8×8 с координатами, подсветкой и обработкой кликов.

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Position, Square } from "@/engine";
import { fileOf, rankOf } from "@/engine";
import { Piece } from "./Piece";
import { useI18n } from "../i18n";
import type { EffectsMode } from "./GameSettings";

interface BoardProps {
  position: Position;
  selected: Square | null;
  legalTargets: Set<Square>;
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  flipped: boolean;
  effectsMode: EffectsMode;
  showMoveHints: boolean;
  moveFeedback: MoveFeedback | null;
  onMovePlayed: (feedback: MoveFeedback) => void;
  onSquareClick: (square: Square) => void;
}

export interface MoveFeedback {
  capture: boolean;
  check: boolean;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
function BoardImpl({
  position,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  flipped,
  effectsMode,
  showMoveHints,
  moveFeedback,
  onMovePlayed,
  onSquareClick,
}: BoardProps) {
  const { pieceName: getPieceName } = useI18n();
  const hasRendered = useRef(false);
  const previousMove = useRef(lastMove);
  const squareRefs = useRef(new Map<Square, HTMLButtonElement>());
  const pieceRefs = useRef(new Map<Square, HTMLSpanElement>());
  const activeAnimation = useRef<Animation | null>(null);
  const captureTimer = useRef<number | null>(null);
  const [captureEffect, setCaptureEffect] = useState<{
    square: Square;
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [reverbId, setReverbId] = useState<number | null>(null);
  const glitchId = useRef(0);
  const [crtGlitches, setCrtGlitches] = useState<
    Array<{ id: number; top: number; height: number; duration: number }>
  >([]);

  useEffect(
    () => () => {
      if (captureTimer.current) window.clearTimeout(captureTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (effectsMode !== "overdrive") {
      setCrtGlitches([]);
      return;
    }

    let spawnTimer: number | null = null;
    let dismissTimer: number | null = null;
    const spawnGlitch = () => {
      const count = Math.random() < 0.28 ? 2 : 1;
      setCrtGlitches(
        Array.from({ length: count }, () => ({
          id: ++glitchId.current,
          top: Math.random() * 86 + 4,
          height: Math.random() * 16 + 5,
          duration: Math.round(Math.random() * 180 + 180),
        })),
      );
      dismissTimer = window.setTimeout(() => setCrtGlitches([]), 420);
      spawnTimer = window.setTimeout(
        spawnGlitch,
        Math.round(Math.random() * 2100 + 650),
      );
    };
    spawnTimer = window.setTimeout(spawnGlitch, 500);

    return () => {
      if (spawnTimer) window.clearTimeout(spawnTimer);
      if (dismissTimer) window.clearTimeout(dismissTimer);
    };
  }, [effectsMode]);

  useLayoutEffect(() => {
    const previous = previousMove.current;
    previousMove.current = lastMove;

    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    if (!lastMove) return;
    if (previous?.from === lastMove.from && previous.to === lastMove.to) {
      return;
    }

    if (moveFeedback) onMovePlayed(moveFeedback);
    if (effectsMode === "overdrive") setReverbId(Date.now());
    if (moveFeedback?.capture && effectsMode !== "none") {
      if (captureTimer.current) window.clearTimeout(captureTimer.current);
      const targetRect = squareRefs.current
        .get(lastMove.to)
        ?.getBoundingClientRect();
      setCaptureEffect({
        square: lastMove.to,
        id: Date.now(),
        x: targetRect
          ? targetRect.left + targetRect.width / 2
          : window.innerWidth / 2,
        y: targetRect
          ? targetRect.top + targetRect.height / 2
          : window.innerHeight / 2,
      });
      captureTimer.current = window.setTimeout(
        () => setCaptureEffect(null),
        560,
      );
    }

    const from = squareRefs.current.get(lastMove.from);
    const to = pieceRefs.current.get(lastMove.to);
    if (
      !from ||
      !to ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    activeAnimation.current?.cancel();
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const animation = to.animate(
      [
        {
          transform: `translate(${fromRect.left - toRect.left}px, ${fromRect.top - toRect.top}px)`,
        },
        { transform: "translate(0, 0)" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.2, 0.82, 0.25, 1)",
      },
    );
    activeAnimation.current = animation;
    animation.onfinish = () => {
      if (activeAnimation.current === animation) activeAnimation.current = null;
    };
  }, [effectsMode, lastMove, moveFeedback, onMovePlayed, position.board]);

  // Порядок обхода клеток зависит от ориентации доски.
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <>
      <div
        className={`board ${effectsMode === "overdrive" ? "board--overdrive" : ""}`}
      >
        {ranks.map((r) =>
          files.map((f) => {
            const sq: Square = r * 8 + f;
            const piece = position.board[sq];
            const isDark = (rankOf(sq) + fileOf(sq)) % 2 === 1;
            const isSelected = selected === sq;
            const isTarget = legalTargets.has(sq);
            const isCapture = isTarget && piece !== null;
            const isLastMove =
              lastMove !== null && (lastMove.from === sq || lastMove.to === sq);
            const isCheck = checkSquare === sq;
            const squareName = FILES[f] + (r + 1);
            const pieceName = piece
              ? getPieceName(piece.color, piece.type)
              : null;
            const showFileLabel = r === (flipped ? 7 : 0);
            const showRankLabel = f === (flipped ? 0 : 7);

            const classes = [
              "square",
              isDark ? "square--dark" : "square--light",
              isSelected && "square--selected",
              isLastMove && "square--last-move",
              isCheck && "square--check",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={sq}
                type="button"
                className={classes}
                onClick={() => onSquareClick(sq)}
                ref={(element) => {
                  if (element) squareRefs.current.set(sq, element);
                  else squareRefs.current.delete(sq);
                }}
                aria-label={
                  pieceName ? `${squareName}, ${pieceName}` : squareName
                }
              >
                {showFileLabel && (
                  <span
                    className={`square__coord square__coord--file ${
                      isDark
                        ? "square__coord--dark-text"
                        : "square__coord--light-text"
                    }`}
                  >
                    {FILES[f]}
                  </span>
                )}
                {showRankLabel && (
                  <span
                    className={`square__coord square__coord--rank ${
                      isDark
                        ? "square__coord--dark-text"
                        : "square__coord--light-text"
                    }`}
                  >
                    {r + 1}
                  </span>
                )}
                {piece && (
                  <span
                    className="square__piece"
                    ref={(element) => {
                      if (element) pieceRefs.current.set(sq, element);
                      else pieceRefs.current.delete(sq);
                    }}
                  >
                    <Piece color={piece.color} type={piece.type} />
                  </span>
                )}
                {showMoveHints && isTarget && !isCapture && (
                  <span className="square__hint" />
                )}
                {showMoveHints && isCapture && (
                  <span className="square__capture-ring" />
                )}
                {captureEffect?.square === sq && (
                  <span
                    className={`square__capture-effect ${
                      effectsMode === "overdrive"
                        ? "square__capture-effect--overdrive"
                        : ""
                    }`}
                    key={captureEffect.id}
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </button>
            );
          }),
        )}
        {reverbId && (
          <span
            className="board__cyber-reverb"
            key={reverbId}
            aria-hidden="true"
          />
        )}
        {effectsMode === "overdrive" && (
          <span className="board__crt-overlay" aria-hidden="true" />
        )}
        {crtGlitches.map((glitch) => (
          <span
            className="board__crt-glitch"
            key={glitch.id}
            aria-hidden="true"
            style={{
              top: `${glitch.top}%`,
              height: glitch.height,
              animationDuration: `${glitch.duration}ms`,
            }}
          />
        ))}
      </div>
      {captureEffect &&
        effectsMode === "overdrive" &&
        createPortal(
          <span
            className="overdrive-screen-fx"
            key={captureEffect.id}
            style={{ left: captureEffect.x, top: captureEffect.y }}
          >
            <span />
            <span />
            <span />
          </span>,
          document.body,
        )}
    </>
  );
}

export const Board = memo(BoardImpl);
