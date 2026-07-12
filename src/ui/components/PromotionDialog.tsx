// Диалог выбора фигуры превращения пешки.

import type { Color } from "@/engine";
import { pieceGlyph } from "../pieces";

interface PromotionDialogProps {
  color: Color;
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}

const OPTIONS = ["q", "r", "b", "n"] as const;

export function PromotionDialog({
  color,
  onSelect,
  onCancel,
}: PromotionDialogProps) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="promotion" onClick={(e) => e.stopPropagation()}>
        <h3 className="promotion__title">Выберите фигуру</h3>
        <div className="promotion__options">
          {OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className={`promotion__option promotion__option--${color}`}
              onClick={() => onSelect(t)}
            >
              {pieceGlyph(color, t)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
