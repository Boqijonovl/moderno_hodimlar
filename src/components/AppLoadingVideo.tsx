'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AppLoadingVideoProps {
  message?: string;
  onSkip?: () => void;
  canSkip?: boolean;
}

export default function AppLoadingVideo({
  message = 'Tizim ishga tushirilmoqda...',
  onSkip,
  canSkip = false,
}: AppLoadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Explicitly enforce muted and play for mobile/WebKit/Telegram WebView autoplay policy
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay handled by browser policy
        });
      }
    }
  }, []);

  return (
    <div
      onClick={canSkip ? onSkip : undefined}
      className={`fixed inset-0 z-[9999] min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 select-none overflow-hidden ${
        canSkip ? 'cursor-pointer' : ''
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col items-center">
        {/* Video Card with smooth border and shadow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(30,58,138,0.35)] border border-white/10 bg-black relative"
        >
          <video
            ref={videoRef}
            src="/loading.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Brand & Loading Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 flex flex-col items-center text-center space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-white">
              MODERNO MEBEL
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {message}
          </p>

          {/* Smooth animated progress line */}
          <div className="w-44 h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5 mt-1">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              className="w-1/2 h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 rounded-full"
            />
          </div>

          {canSkip && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.8 }}
              className="text-[11px] text-slate-500 pt-1"
            >
              Davom etish uchun ekranga bosing
            </motion.span>
          )}
        </motion.div>
      </div>
    </div>
  );
}
