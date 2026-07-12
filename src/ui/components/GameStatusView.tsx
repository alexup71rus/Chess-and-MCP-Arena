// Строка статуса игры: чей ход / мат / пат / ничья.

import type { Color, GameStatus } from "@/engine";

interface GameStatusViewProps {
  status: GameStatus;
  turn: Color;
}

const COLOR_NAME: Record<Color, string> = { w: "Белые", b: "Чёрные" };

const DRAW_REASON: Record<string, string> = {
  "fifty-move": "правило 50 ходов",
  threefold: "троекратное повторение",
  "insufficient-material": "недостаточный материал",
};

export function GameStatusView({ status, turn }: GameStatusViewProps) {
  let text: string;
  let tone: "play" | "check" | "end" = "play";

  if (status.kind === "ongoing") {
    if (status.check) {
      text = `Шах — ход за ${COLOR_NAME[turn]}`;
      tone = "check";
    } else {
      text = `Ход за ${COLOR_NAME[turn]}`;
      tone = "play";
    }
  } else if (status.kind === "checkmate") {
    text = `Мат! Победили ${COLOR_NAME[status.winner]}`;
    tone = "end";
  } else if (status.kind === "stalemate") {
    text = "Пат — ничья";
    tone = "end";
  } else {
    text = `Ничья (${DRAW_REASON[status.reason]})`;
    tone = "end";
  }

  return (
    <div className={`status status--${tone}`}>
      <span className="status__text">{text}</span>
    </div>
  );
}
