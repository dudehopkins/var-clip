import { useCallback, useRef } from "react";

export const useTypingSound = () => {
  const audioContext = useRef<AudioContext | null>(null);

  const playKeystroke = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }

    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);

    oscillator.frequency.value = 800 + Math.random() * 200;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.current.currentTime + 0.05
    );

    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.05);
  }, []);

  return { playKeystroke };
};