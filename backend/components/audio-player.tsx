"use client";

import {
  Download,
  Headphones,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

interface AudioPlayerProps {
  src: string;
  title?: string;
  language?: string | null;
  className?: string;
  compact?: boolean;
  autoPlay?: boolean;
}

export function AudioPlayer({
  src,
  title = "Citizen Voice Memo",
  language,
  className,
  compact = false,
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    setHasError(false);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Initial check if already loaded
    if (audio.readyState >= 1) {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error("Audio playback error:", err);
      });
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(e.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-md shadow-sm",
          className,
        )}
      >
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          type="button"
          onClick={togglePlay}
          disabled={hasError || isLoading}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow transition-all hover:bg-brand-dark active:scale-95 disabled:opacity-50"
          title={isPlaying ? "Pause" : "Play citizen voice audio"}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="truncate font-sans font-bold text-slate-200">{title}</span>
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-brand"
          />
        </div>

        {language && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-brand/20 text-brand-light border border-brand/30">
            {language}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-4 shadow-xl text-white backdrop-blur-md",
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header Info */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/40 bg-brand/20 text-brand-light shadow-sm">
            <Headphones className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold tracking-tight text-white">{title}</h4>
            <p className="text-[10px] font-medium text-slate-400">
              Live Citizen Audio Memo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {language && (
            <span className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-light">
              <Mic className="h-2.5 w-2.5" />
              {language}
            </span>
          )}
          <a
            href={src}
            download="citizen_voice_memo.wav"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Download original audio"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Equalizer Visualizer & Waveform Bar */}
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 shadow-inner">
        <div className="flex items-center gap-0.5 h-6 shrink-0">
          {[0.6, 1.0, 0.4, 0.8, 0.5, 0.9, 0.7, 0.3].map((height, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-150",
                isPlaying
                  ? "bg-brand animate-pulse"
                  : "bg-slate-700",
              )}
              style={{
                height: isPlaying ? `${Math.max(20, height * 100)}%` : "20%",
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>

        {/* Scrubber slider */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek audio"
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-brand"
            style={{
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${progressPct}%, #1e293b ${progressPct}%, #1e293b 100%)`,
            }}
          />
        </div>

        <div className="shrink-0 font-mono text-[11px] font-bold text-slate-400">
          <span className="text-cyan-400">{formatTime(currentTime)}</span> / {formatTime(duration)}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={hasError || isLoading}
            className="flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-brand/20 transition-all hover:bg-brand-dark active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
                <span>Play Voice Note</span>
              </>
            )}
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={restart}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Replay from start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={toggleSpeed}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {hasError && (
        <p className="mt-2 text-center text-[10px] font-bold text-rose-400">
          Audio stream failed to load or unsupported format.
        </p>
      )}
    </div>
  );
}
