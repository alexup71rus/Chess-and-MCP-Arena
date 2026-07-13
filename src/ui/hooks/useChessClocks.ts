import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "@/engine";

/** Два шахматных часа: идёт время стороны, чей сейчас ход. */
export function useChessClocks(
  activeColor: Color,
  enabled: boolean,
  reset: boolean,
) {
  const [seconds, setSeconds] = useState<Record<Color, number>>({ w: 0, b: 0 });
  const [paused, setPaused] = useState(false);
  const previousColor = useRef(activeColor);
  const wasReset = useRef(reset);

  useEffect(() => {
    if (reset && !wasReset.current) {
      setSeconds({ w: 0, b: 0 });
      setPaused(false);
    }
    wasReset.current = reset;
  }, [reset]);

  useEffect(() => {
    if (previousColor.current !== activeColor) setPaused(false);
    previousColor.current = activeColor;
  }, [activeColor]);

  useEffect(() => {
    if (!enabled || paused) return;
    const interval = window.setInterval(
      () =>
        setSeconds((value) => ({
          ...value,
          [activeColor]: value[activeColor] + 1,
        })),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [activeColor, enabled, paused]);

  const togglePause = useCallback(() => setPaused((value) => !value), []);
  return { seconds, paused, togglePause };
}
