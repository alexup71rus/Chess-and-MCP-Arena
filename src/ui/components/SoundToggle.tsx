import { useI18n } from "../i18n";
import { Icon } from "./Icon";

interface SoundToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  const { t } = useI18n();
  const label = muted ? t.soundOff : t.soundOn;
  return (
    <button
      type="button"
      className="btn icon-btn sound-toggle"
      aria-label={label}
      aria-pressed={!muted}
      title={label}
      onClick={onToggle}
    >
      <Icon name={muted ? "volume-off" : "volume"} />
    </button>
  );
}
