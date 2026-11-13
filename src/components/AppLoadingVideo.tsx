'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';

interface AppLoadingVideoProps {
  onComplete?: () => void;
  message?: string;
  canSkip?: boolean;
}

export default function AppLoadingVideo({
  onComplete,
  message = 'Ilova ishga tushirilmoqda...',
  canSkip = true,
}: AppLoadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const hasEndedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishSplash = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try playing with sound initially
    video.muted = false;
    video.volume = 1.0;
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
        })
        .catch(() => {
          // If browser/device blocks unmuted autoplay without prior interaction,
          // start muted so video playback starts immediately, and user can tap to unmute
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
    }

    // Safety fallback timer: video is ~10s. If onEnded does not fire for any reason,
    // transition into the app after 10.5 seconds.
    const fallbackTimer = setTimeout(() => {
      finishSplash();
    }, 10500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [finishSplash]);

  const handleToggleSound = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      video.volume = 1.0;
      setIsMuted(false);
      video.play().catch(() => {});
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    const dur = video.duration || 10;
    setCurrentTime(cur);
    setDuration(dur);
    setProgress(Math.min(100, (cur / dur) * 100));

    // If within 0.15s of end, transition immediately
    if (dur > 0 && cur >= dur - 0.15) {
      finishSplash();
    }
  };

  const handleEnded = () => {
    finishSplash();
  };

  return (
    <div
      onClick={() => {
        // If muted on initial load due to autoplay restrictions, a tap anywhere un-mutes
        if (isMuted && videoRef.current) {
          handleToggleSound();
        }
      }}
      className="fixed inset-0 z-[9999] min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header Controls */}
      <div className="relative z-20 w-full max-w-sm sm:max-w-md flex items-center justify-between pt-2">
        {/* Sound toggle button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all active:scale-95 ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
              : 'bg-white/10 text-emerald-400 border border-white/15 hover:bg-white/15'
          }`}
          title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Ovozni yoqish</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Ovoz yoniq</span>
            </>
          )}
        </button>

        {/* Skip button */}
        {canSkip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finishSplash();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 border border-white/15 backdrop-blur-md transition-all active:scale-95"
          >
            <span>O&apos;tkazib yuborish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center Video Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col items-center my-auto py-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(30,58,138,0.4)] border border-white/10 bg-black relative"
        >
          <video
            ref={videoRef}
            src="/loading.mp4"
            autoPlay
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Brand info & real progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-5 w-full flex flex-col items-center text-center space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-white">
              MODERNO MEBEL
            </h1>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            {message}
          </p>

          {/* Synchronized video progress bar */}
          <div className="w-full max-w-[280px] space-y-1 pt-1">
            <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-white/5">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 rounded-full transition-all duration-100 ease-linear"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
              <span>{Math.floor(currentTime)}s</span>
              <span>{Math.round(duration)}s</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 pb-2 text-center">
        {isMuted ? (
          <p className="text-[11px] text-amber-300/80 font-medium animate-pulse">
            🔊 Ovozni eshitish uchun ekranga yoki tugmaga bosing
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">
            Video tugashi bilan tizimga kiriladi...
          </p>
        )}
      </div>
    </div>
  );
}
