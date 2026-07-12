// Кнопки управления партией.

interface ControlsProps {
  canUndo: boolean;
  isFlipped: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onFlip: () => void;
}

export function Controls({
  canUndo,
  isFlipped,
  onNewGame,
  onUndo,
  onFlip,
}: ControlsProps) {
  return (
    <div className="controls">
      <button type="button" className="btn btn--primary" onClick={onNewGame}>
        Новая партия
      </button>
      <button
        type="button"
        className="btn"
        onClick={onUndo}
        disabled={!canUndo}
      >
        ← Отменить ход
      </button>
      <button type="button" className="btn" onClick={onFlip}>
        {isFlipped ? "↑ Перевернуть" : "↓ Перевернуть"}
      </button>
    </div>
  );
}
