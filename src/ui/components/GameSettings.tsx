import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";

export type EffectsMode = "none" | "classic" | "overdrive";

interface GameSettingsProps {
  effectsMode: EffectsMode;
  showMoveHints: boolean;
  showTimer?: boolean;
  onEffectsModeChange: (mode: EffectsMode) => void;
  onShowMoveHintsChange: (show: boolean) => void;
  onShowTimerChange?: (show: boolean) => void;
}

export function GameSettings({
  effectsMode,
  showMoveHints,
  showTimer,
  onEffectsModeChange,
  onShowMoveHintsChange,
  onShowTimerChange,
}: GameSettingsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsideClick);
    return () => window.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  return (
    <div className="game-settings" ref={rootRef}>
      <button
        type="button"
        className="btn icon-btn sound-toggle"
        aria-label={t.settings}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="settings" />
      </button>
      {open && (
        <section className="settings-popover" aria-label={t.settings}>
          <div className="settings-popover__title">{t.effects}</div>
          <div className="settings-options">
            <button
              type="button"
              className={effectsMode === "none" ? "is-active" : ""}
              onClick={() => onEffectsModeChange("none")}
            >
              {t.noEffects}
            </button>
            <button
              type="button"
              className={effectsMode === "classic" ? "is-active" : ""}
              onClick={() => onEffectsModeChange("classic")}
            >
              {t.classicEffects}
            </button>
            <button
              type="button"
              className={effectsMode === "overdrive" ? "is-active" : ""}
              onClick={() => onEffectsModeChange("overdrive")}
            >
              {t.overdriveEffects}
            </button>
          </div>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={showMoveHints}
              onChange={(event) => onShowMoveHintsChange(event.target.checked)}
            />
            {t.showMoveHints}
          </label>
          {onShowTimerChange && (
            <label className="settings-check">
              <input
                type="checkbox"
                checked={showTimer}
                onChange={(event) => onShowTimerChange(event.target.checked)}
              />
              {t.showTimer}
            </label>
          )}
        </section>
      )}
    </div>
  );
}
