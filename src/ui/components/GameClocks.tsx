import type { Color } from "@/engine";
import { useI18n } from "../i18n";

interface GameClocksProps {
  activeColor: Color;
  seconds: Record<Color, number>;
  paused: boolean;
  onTogglePause: () => void;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function GameClocks({
  activeColor,
  seconds,
  paused,
  onTogglePause,
}: GameClocksProps) {
  const { colorName } = useI18n();
  return (
    <div className="game-clocks" aria-label="Chess clocks">
      {(["w", "b"] as Color[]).map((color) => {
        const active = color === activeColor;
        return (
          <button
            type="button"
            className={`game-clock ${active ? "game-clock--active" : ""} ${
              active && paused ? "game-clock--paused" : ""
            }`}
            key={color}
            disabled={!active}
            aria-pressed={active && paused}
            onClick={onTogglePause}
          >
            <span>{colorName(color)}</span>
            <strong>{formatClock(seconds[color])}</strong>
          </button>
        );
      })}
    </div>
  );
}
