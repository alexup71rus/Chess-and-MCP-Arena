// Строка статуса игры: чей ход / мат / пат / ничья.

import type { Color, GameStatus } from "@/engine";
import { useI18n } from "../i18n";

interface GameStatusViewProps {
  status: GameStatus;
  turn: Color;
}

export function GameStatusView({ status, turn }: GameStatusViewProps) {
  const { statusText } = useI18n();
  let tone: "play" | "check" | "end" = "play";

  if (status.kind === "ongoing") {
    if (status.check) {
      tone = "check";
    }
  } else if (status.kind === "checkmate") {
    tone = "end";
  } else {
    tone = "end";
  }

  return (
    <div className={`status status--${tone}`}>
      <span className="status__marker" aria-hidden="true" />
      <span className="status__text">{statusText(status, turn)}</span>
    </div>
  );
}
