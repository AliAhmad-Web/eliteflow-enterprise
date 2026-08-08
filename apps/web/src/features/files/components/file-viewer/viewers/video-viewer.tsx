"use client";

import { Maximize2, PictureInPicture2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface VideoViewerProps {
  url: string;
  fileName: string;
  onStatusChange?: (status: string) => void;
}

export function VideoViewer({ url, fileName, onStatusChange }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    onStatusChange?.("Video ready");
  }, [onStatusChange]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-zinc-950"
      role="region"
      aria-label={`Video player for ${fileName}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900/90 px-3 py-1.5">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          Speed
          <select
            className="h-8 rounded-md border border-white/10 bg-zinc-800 px-2 text-zinc-100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => (
              <option key={v} value={v}>
                {v}x
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-zinc-200 hover:bg-white/10"
            onClick={() => void videoRef.current?.requestPictureInPicture?.()}
          >
            <PictureInPicture2 className="h-4 w-4" />
            PiP
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-zinc-200 hover:bg-white/10"
            onClick={() => void videoRef.current?.requestFullscreen?.()}
          >
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <video
          ref={videoRef}
          controls
          controlsList="nodownload"
          className="max-h-full max-w-full rounded-xl shadow-2xl"
          src={url}
          preload="metadata"
        >
          <track kind="captions" />
        </video>
      </div>
    </div>
  );
}
