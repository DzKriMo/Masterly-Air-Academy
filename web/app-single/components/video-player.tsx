"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react";

interface Props {
  src: string;
  onTimeUpdate?: (t: number) => void;
  onPause?: () => void;
  onPlay?: () => void;
  onEnded?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export function VideoPlayer({ src, onTimeUpdate, onPause, onPlay, onEnded, videoRef, className }: Props) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || internalRef;
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [buffering, setBuffering] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [ref]);

  const toggleMute = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * duration;
  };

  const handleVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const fullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  const skip = (sec: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + sec));
  };

  const showControlsTemp = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handlePlay = () => { setPlaying(true); onPlay?.(); };
  const handlePause = () => { setPlaying(false); setShowControls(true); onPause?.(); };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.preload = "metadata";
    const onTime = () => { setCurrentTime(el.currentTime); onTimeUpdate?.(el.currentTime); };
    const onDur = () => setDuration(el.duration);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onSeeked = () => setBuffering(false);
    const onSeeking = () => setBuffering(true);
    const onProgress = () => {
      if (el.buffered.length > 0) {
        setBuffered(el.buffered.end(el.buffered.length - 1));
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onDur);
    el.addEventListener("durationchange", onDur);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("progress", onProgress);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("progress", onProgress);
    };
  }, [ref, onTimeUpdate]);

  return (
    <div
      ref={containerRef}
      className={`relative group w-full aspect-video bg-black rounded-xl overflow-hidden cursor-pointer ${className || ""}`}
      onMouseMove={showControlsTemp}
      onClick={togglePlay}
    >
      <video
        ref={ref}
        src={src}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onVolumeChange={() => { if (ref.current) { setVolume(ref.current.volume); setMuted(ref.current.muted); } }}
      />

      {/* Loading / buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <svg className="w-10 h-10 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#c4943c" strokeWidth="3" />
            <path className="opacity-75" fill="#c4943c" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Big play button overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <button className="w-16 h-16 flex items-center justify-center rounded-full bg-gold-500/90 hover:bg-gold-500 text-navy-900 transition-all hover:scale-110">
            <Play className="w-7 h-7 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-8 pb-3 transition-opacity duration-300 ${
          showControls || !playing ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="relative h-1 bg-navy-600/50 rounded-full mb-3 cursor-pointer group/progress" onClick={seek}>
          <div className="absolute inset-y-0 left-0 bg-gold-500/30 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
          <div className="absolute inset-y-0 left-0 bg-gold-500 rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gold-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg"
            style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-gold-500 transition-colors">
            {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>

          {/* Skip back */}
          <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Skip forward */}
          <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Time */}
          <span className="text-xs text-white/80 font-mono min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-2 group/vol">
            <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-0 group-hover/vol:w-20 transition-all overflow-hidden">
              <div className="relative h-1 bg-navy-600/50 rounded-full cursor-pointer w-20" onClick={handleVolume}>
                <div className="absolute inset-y-0 left-0 bg-gold-500 rounded-full" style={{ width: `${muted ? 0 : volume * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Fullscreen */}
          <button onClick={fullscreen} className="text-white/70 hover:text-white transition-colors">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
