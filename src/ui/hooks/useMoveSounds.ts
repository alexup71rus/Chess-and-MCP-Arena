import { useCallback, useEffect, useRef } from "react";

export type MoveSound = "move" | "capture" | "check";

const tones: Record<MoveSound, number[]> = {
  move: [510],
  capture: [170, 95],
  check: [740, 990],
};

/** Короткие синтезированные сигналы — без загрузки аудиофайлов. */
export function useMoveSounds(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(
    () => () => {
      void contextRef.current?.close();
    },
    [],
  );

  const getContext = useCallback(() => {
    if (!contextRef.current) contextRef.current = new AudioContext();
    return contextRef.current;
  }, []);

  const unlock = useCallback(() => {
    void getContext().resume();
  }, [getContext]);

  const play = useCallback(
    (sound: MoveSound) => {
      if (!enabled) return;
      const context = getContext();
      const start = context.currentTime;
      tones[sound].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = start + index * 0.07;
        oscillator.type = sound === "capture" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.12, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.14);
      });
    },
    [enabled, getContext],
  );

  return { play, unlock };
}
