"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays the kiosk's pre-recorded Urdu lines in sequence. Missing clips are skipped silently,
 * so the kiosk still works (as text) if a voice file isn't available.
 */
export function useVoice() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<string[]>([]);
  const last = useRef<string[]>([]);
  const playNext = useRef<() => void>(() => {});
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = new Audio();
    audio.current = a;
    playNext.current = () => {
      const url = queue.current.shift();
      if (!url) {
        setSpeaking(false);
        return;
      }
      a.src = url;
      a.play().catch(() => playNext.current());
    };
    a.onended = () => playNext.current();
    a.onerror = () => playNext.current();
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  const start = useCallback((urls: string[]) => {
    audio.current?.pause();
    queue.current = [...urls];
    setSpeaking(true);
    playNext.current();
  }, []);

  const say = useCallback(
    (urls: string[]) => {
      last.current = urls;
      if (!muted) start(urls);
    },
    [muted, start],
  );

  const stop = useCallback(() => {
    queue.current = [];
    audio.current?.pause();
    setSpeaking(false);
  }, []);

  const replay = useCallback(() => start(last.current), [start]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) stop();
      return !m;
    });
  }, [stop]);

  return { say, stop, replay, speaking, muted, toggleMute };
}
