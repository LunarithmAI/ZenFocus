import React from 'react';
import { TimerMode } from '../types';

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isActive: boolean;
  ecoMode: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  timeLeft, 
  totalTime, 
  mode, 
  isActive, 
  ecoMode, 
  onToggle, 
  onReset 
}) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate stroke dashoffset for the circle
  // Increased radius significantly to cover text/buttons
  const radius = 220; 
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const dashOffset = circumference * (1 - progress);

  // Dynamic Color based on mode
  const getColor = () => {
    switch(mode) {
      case TimerMode.POMODORO: return 'stroke-red-400';
      case TimerMode.SHORT_BREAK: return 'stroke-teal-400';
      case TimerMode.LONG_BREAK: return 'stroke-blue-400';
      default: return 'stroke-white';
    }
  };

  const getLabel = () => {
    switch(mode) {
      case TimerMode.POMODORO: return 'Focus Time';
      case TimerMode.SHORT_BREAK: return 'Short Break';
      case TimerMode.LONG_BREAK: return 'Long Break';
    }
  };

  return (
    // Adjusted scaling logic for the 40% column width on LG screens
    // lg:scale-90 ensures it doesn't overflow in the 10-column layout
    <div className="flex flex-col items-center justify-center relative transform scale-[0.7] sm:scale-90 lg:scale-[0.85] xl:scale-100 transition-transform duration-500">
      <div className="relative w-[500px] h-[500px] md:w-[580px] md:h-[580px] flex items-center justify-center">
        {/* SVG Circle Background */}
        <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          {/* Progress Circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={`${getColor()} ${ecoMode ? '' : 'transition-all duration-1000 ease-linear'}`}
          />
        </svg>

        {/* Digital Time & Controls Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white select-none">
          <h2 className="text-base md:text-lg font-bold uppercase tracking-[0.3em] opacity-50 mb-6">{getLabel()}</h2>
          <div className="text-[7rem] md:text-[9rem] lg:text-[10rem] font-bold font-mono tracking-tighter tabular-nums leading-none filter drop-shadow-lg">
            {formattedTime}
          </div>
          <div className="mt-12 flex items-center gap-6">
             <button
              onClick={onToggle}
              className="bg-white hover:bg-white/90 text-black px-12 py-5 rounded-full text-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button
               onClick={onReset}
               className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-5 rounded-full transition-all border border-white/10 hover:border-white/30"
               aria-label="Reset Timer"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;