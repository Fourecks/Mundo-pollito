
import React from 'react';
import { Todo } from '../types';

interface BackgroundTimerProps {
  timeLeft: number;
  opacity: number;
  focusedTask?: Todo | null;
  isFocusMode?: boolean;
}

const BackgroundTimer: React.FC<BackgroundTimerProps> = ({ 
  timeLeft, 
  opacity, 
  focusedTask = null, 
  isFocusMode = false 
}) => {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div 
        className="fixed inset-0 flex flex-col items-center justify-center -z-20 pointer-events-none transition-all duration-500"
        aria-hidden="true"
    >
      {/* Active task in focus mode: ONLY shown when focus mode (hiding the desktop) is active */}
      {isFocusMode && focusedTask && (
        <div 
          className="mb-4 sm:mb-8 max-w-xl mx-4 px-6 py-2.5 rounded-2xl bg-black/40 dark:bg-black/60 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto transition-all duration-300"
          style={{ opacity: Math.max(0.85, opacity / 100) }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-300 dark:text-red-400 leading-tight">
              Tarea en Enfoque
            </span>
            <span className="text-white text-base sm:text-2xl font-bold tracking-tight truncate drop-shadow-md">
              {focusedTask.text}
            </span>
          </div>
        </div>
      )}

      <div className="font-bold select-none text-center leading-none" style={{ color: `rgba(255, 255, 255, ${opacity / 100})`, textShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
        <span className="text-[18vw]">{mins}</span>
        <span className="text-[10vw] block -mt-[2vw]">{secs}</span>
      </div>
    </div>
  );
};

export default BackgroundTimer;

