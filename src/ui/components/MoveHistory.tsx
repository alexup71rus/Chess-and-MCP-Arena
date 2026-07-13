// Список ходов в стандартной алгебраической нотации.

import { useEffect, useRef } from "react";
import type { HistoryEntry } from "../hooks/useChessGame";
import { useI18n } from "../i18n";

interface MoveHistoryProps {
  history: HistoryEntry[];
}

export function MoveHistory({ history }: MoveHistoryProps) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему ходу.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history.length]);

  // Группируем по парам: номер хода, белые, (опц.) чёрные.
  const rows: Array<{ no: number; white?: string; black?: string }> = [];
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const moveNo = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    if (isWhite) {
      rows.push({ no: moveNo, white: entry.san });
    } else {
      rows[rows.length - 1].black = entry.san;
    }
  }

  return (
    <div className="history">
      <div className="history__head">{t.history}</div>
      <div className="history__list" ref={listRef}>
        {rows.length === 0 && (
          <div className="history__empty">{t.gameNotStarted}</div>
        )}
        {rows.map((row) => (
          <div className="history__row" key={row.no}>
            <span className="history__no">{row.no}.</span>
            <span className="history__white">{row.white}</span>
            <span className="history__black">{row.black ?? ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
