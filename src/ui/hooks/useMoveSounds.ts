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
    (sound: MoveSound, overdrive = false) => {
      if (!enabled) return;
      const context = getContext();
      const start = context.currentTime;
      tones[sound].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = start + index * 0.07;
        oscillator.type = overdrive
          ? "sawtooth"
          : sound === "capture"
            ? "triangle"
            : "sine";
        oscillator.frequency.setValueAtTime(
          overdrive ? frequency * 1.32 : frequency,
          at,
        );
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(
          overdrive ? 0.18 : 0.12,
          at + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          at + (overdrive ? 0.18 : 0.13),
        );
        oscillator.connect(gain);
        if (overdrive) {
          const delay = context.createDelay(0.35);
          const feedback = context.createGain();
          const echoGain = context.createGain();
          delay.delayTime.setValueAtTime(0.085, at);
          feedback.gain.setValueAtTime(0.28, at);
          echoGain.gain.setValueAtTime(0.34, at);
          gain.connect(context.destination);
          gain.connect(delay);
          delay.connect(feedback).connect(delay);
          delay.connect(echoGain).connect(context.destination);
        } else {
          gain.connect(context.destination);
        }
        oscillator.start(at);
        oscillator.stop(at + (overdrive ? 0.19 : 0.14));
      });
    },
    [enabled, getContext],
  );

  return { play, unlock };
}
