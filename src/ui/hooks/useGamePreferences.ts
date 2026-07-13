import { useCallback, useEffect, useState } from "react";
import type { EffectsMode } from "../components/GameSettings";

interface GamePreferences {
  muted: boolean;
  effectsMode: EffectsMode;
  showMoveHints: boolean;
  showTimer: boolean;
}

const storageKey = "chess-arena-game-preferences";
const defaults: GamePreferences = {
  muted: true,
  effectsMode: "classic",
  showMoveHints: true,
  showTimer: false,
};

function loadPreferences(): GamePreferences {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved) as Partial<GamePreferences>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : defaults.muted,
      effectsMode: ["none", "classic", "overdrive"].includes(
        parsed.effectsMode ?? "",
      )
        ? (parsed.effectsMode as EffectsMode)
        : defaults.effectsMode,
      showMoveHints:
        typeof parsed.showMoveHints === "boolean"
          ? parsed.showMoveHints
          : defaults.showMoveHints,
      showTimer:
        typeof parsed.showTimer === "boolean"
          ? parsed.showTimer
          : defaults.showTimer,
    };
  } catch {
    return defaults;
  }
}

export function useGamePreferences() {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Настройки продолжают работать до закрытия страницы без localStorage.
    }
  }, [preferences]);

  const setMuted = useCallback((muted: boolean) => {
    setPreferences((value) => ({ ...value, muted }));
  }, []);
  const setEffectsMode = useCallback((effectsMode: EffectsMode) => {
    setPreferences((value) => ({ ...value, effectsMode }));
  }, []);
  const setShowMoveHints = useCallback((showMoveHints: boolean) => {
    setPreferences((value) => ({ ...value, showMoveHints }));
  }, []);
  const setShowTimer = useCallback((showTimer: boolean) => {
    setPreferences((value) => ({ ...value, showTimer }));
  }, []);

  return {
    ...preferences,
    setMuted,
    setEffectsMode,
    setShowMoveHints,
    setShowTimer,
  };
}
