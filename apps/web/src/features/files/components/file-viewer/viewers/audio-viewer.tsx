"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioViewerProps {
  url: string;
  fileName: string;
  onStatusChange?: (status: string) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioViewer({ url, fileName, onStatusChange }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const bars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => 20 + ((i * 17) % 60) + (i % 5) * 4),
    [],
  );

  useEffect(() => {
    onStatusChange?.("Audio ready");
  }, [onStatusChange]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6"
      role="region"
      aria-label={`Audio player for ${fileName}`}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />

      <p className="mb-8 max-w-lg truncate text-center text-lg font-medium text-zinc-100">
        {fileName}
      </p>

      <div
        className="mb-8 flex h-24 items-end gap-1"
        aria-hidden
      >
        {bars.map((h, i) => {
          const active =
            duration > 0 ? i / bars.length <= current / duration : false;
          return (
            <span
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-colors",
                active ? "bg-primary" : "bg-zinc-700",
                playing && active && "animate-pulse",
              )}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          aria-label="Seek"
          className="w-full accent-primary"
          onChange={(e) => {
            const t = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setCurrent(t);
          }}
        />
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
          >
            {playing ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 pl-0.5" />
            )}
          </Button>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            Speed
            <select
              className="h-8 rounded-md border border-white/10 bg-zinc-800 px-2 text-zinc-100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <option key={v} value={v}>
                  {v}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
