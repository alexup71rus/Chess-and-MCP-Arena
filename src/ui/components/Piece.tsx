// Отрисовка одной фигуры.

import { memo } from "react";
import type { Color, PieceType } from "@/engine";
import { pieceGlyph } from "../pieces";

interface PieceProps {
  color: Color;
  type: PieceType;
}

function PieceImpl({ color, type }: PieceProps) {
  return (
    <span className={`piece piece--${color}`} aria-hidden="true">
      {pieceGlyph(color, type)}
    </span>
  );
}

export const Piece = memo(PieceImpl);
