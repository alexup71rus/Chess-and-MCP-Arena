// Кнопки управления партией.

interface ControlsProps {
  canUndo: boolean;
  isFlipped: boolean;
  onUndo: () => void;
  onFlip: () => void;
}

export function Controls({
  canUndo,
  isFlipped,
  onUndo,
  onFlip,
}: ControlsProps) {
  return (
    <div className="controls">
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
