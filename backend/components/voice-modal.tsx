"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Headphones,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { DEMO_SAMPLE_AUDIO_URL } from "@/lib/demo-audio";
import type { HazardRow } from "@/lib/types";

interface VoiceModalProps {
  open: boolean;
  onClose: () => void;
  hazard: HazardRow | null;
  onAttachAudio?: (audioUrl: string) => void;
}

export function VoiceModal({
  open,
  onClose,
  hazard,
  onAttachAudio,
}: VoiceModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Officer live recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeAudioSrc =
    hazard?.audio_url || recordedAudioUrl || (open ? DEMO_SAMPLE_AUDIO_URL : "");

  const hasOriginalAudio = Boolean(hazard?.audio_url);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    if (audio.readyState >= 1) {
      setDuration(audio.duration || 0);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [activeAudioSrc]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const targetTime = Number(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }

  function setSpeed(rate: number) {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }

  function toggleMute() {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  }

  function restart() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  }

  // Live microphone recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          setRecordedAudioUrl(base64Url);
          if (onAttachAudio) onAttachAudio(base64Url);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function formatTime(secs: number) {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  if (!open || !hazard) return null;

  const detectedLang = hazard.detected_language || "English";
  const hasNoSpeech =
    detectedLang.includes("No Speech") ||
    hazard.summary?.includes("clicking") ||
    hazard.summary?.includes("no verbal");

  return (
    <Modal open={open} onClose={onClose} className="lg:max-w-2xl">
      <div className="flex flex-col p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Voice Intelligence & Audio Console
                </h3>
                <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[10px] font-extrabold text-brand uppercase">
                  #{hazard.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Citizen voice note review, speech translation, and officer audio dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Audio Player Card */}
        <div className="mt-5 rounded-3xl bg-slate-900 p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isPlaying && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    isPlaying ? "bg-cyan-500" : "bg-slate-500",
                  )}
                />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                {hasOriginalAudio
                  ? "Citizen Audio Recording"
                  : recordedAudioUrl
                    ? "Recorded Officer Dispatch Note"
                    : "Simulated Colombo Citizen Hotline Audio"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {detectedLang}
              </span>
              <a
                href={activeAudioSrc}
                download={`incident-${hazard.id.slice(0, 8)}-voice.wav`}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/20 transition-all"
                title="Download Audio Evidence"
              >
                <Download className="h-3 w-3" />
                <span>Export WAV</span>
              </a>
            </div>
          </div>

          <audio ref={audioRef} src={activeAudioSrc} preload="metadata" />

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1.5 h-16 py-2 bg-slate-800/60 rounded-2xl border border-white/5 px-4 mb-4">
            {[30, 45, 65, 80, 50, 95, 70, 40, 85, 60, 75, 90, 55, 35, 65, 80, 45, 90, 60, 40, 70, 85, 50, 30].map(
              (baseHeight, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full transition-all duration-150",
                    isPlaying
                      ? "bg-cyan-400"
                      : "bg-slate-600",
                  )}
                  style={{
                    height: isPlaying
                      ? `${Math.max(15, Math.min(100, baseHeight * (0.6 + Math.sin((currentTime * 8) + i) * 0.4)))}%`
                      : `${baseHeight * 0.4}%`,
                  }}
                />
              ),
            )}
          </div>

          {/* Scrubber */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={restart}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all shadow-md active:scale-95"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-status-crimson" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Playback Speed Selectors */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {[0.8, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSpeed(speed)}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all",
                    playbackRate === speed
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-400 hover:text-white",
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Speech Recognition & AI Translation */}
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <Globe className="h-4 w-4 text-brand" />
                Spoken Language & Voice Content
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase",
                  hasNoSpeech
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
                )}
              >
                {hasNoSpeech ? (
                  <>
                    <AlertTriangle className="h-3 w-3" /> Non-Verbal / Ambient
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Speech Verified
                  </>
                )}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Citizen Spoken Language
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {detectedLang}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Operational English AI Summary
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-0.5 bg-white p-3 rounded-xl border border-slate-200">
                  {hazard.summary ||
                    hazard.description ||
                    "Hazard reported. Voice audio analyzed for emergency signals."}
                </p>
              </div>

              {hazard.trace?.verdict?.reasoning && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    AI Dispatch Reasoning
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5 italic">
                    "{hazard.trace.verdict.reasoning}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Speech Signals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-brand" />
                Spoken Landmarks
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                  Ward {hazard.ward_id}
                </span>
                {hazard.description?.includes("bridge") && (
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                    River Bridge
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                <Radio className="h-3 w-3 text-brand" />
                Dispatch Category
              </span>
              <p className="mt-1 text-xs font-extrabold text-slate-900">
                {hazard.category} · {hazard.urgency} Urgency
              </p>
            </div>
          </div>

          {/* Officer Audio Dispatch Recording Tool */}
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-brand" />
                Attach Officer Audio Dispatch Memo
              </span>
              {isRecording && (
                <span className="flex items-center gap-1 text-xs font-extrabold text-status-crimson animate-pulse">
                  ● Recording {recordingSeconds}s
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Speak into your microphone to record an official tactical voice briefing for field crews.
            </p>

            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand transition-all shadow-sm"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Start Voice Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-xl bg-status-crimson px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-700 transition-all shadow-sm"
                >
                  <MicOff className="h-3.5 w-3.5" />
                  <span>Stop & Save Audio</span>
                </button>
              )}

              {recordedAudioUrl && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Dispatch Memo Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
          >
            Close Console
          </button>
        </div>
      </div>
    </Modal>
  );
}
