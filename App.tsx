
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, Task, Settings, Theme } from './types';
import { DEFAULT_SETTINGS, THEMES } from './constants';
import TimerDisplay from './components/TimerDisplay';
import TaskList from './components/TaskList';
import MediaPanel from './components/MediaPanel';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  // State: Settings
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  
  // State: Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('zenfocus_gemini_api_key') || '';
  });

  // Save API key when it changes
  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('zenfocus_gemini_api_key', geminiApiKey);
    } else {
      localStorage.removeItem('zenfocus_gemini_api_key');
    }
  }, [geminiApiKey]);

  // State: Themes (Default + Custom)
  const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem('zenfocus_custom_themes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load custom themes", e);
      return [];
    }
  });

  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [showSettings, setShowSettings] = useState(false);

  // Save custom themes to local storage
  useEffect(() => {
    localStorage.setItem('zenfocus_custom_themes', JSON.stringify(customThemes));
  }, [customThemes]);

  const handleAddCustomTheme = (newTheme: Theme) => {
    setCustomThemes(prev => [...prev, newTheme]);
    setTheme(newTheme); // Automatically select the new theme
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    // If the deleted theme was active, revert to default
    if (theme.id === themeId) {
      setTheme(THEMES[0]);
    }
  };

  // State: Timer
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // State: Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Refs for timer interval
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio for notifications
  const playNotification = () => {
    if (!settings.soundEnabled) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Function to play a single beep
    const beep = (startTime: number, freq: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Envelope to avoid clicking
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Play a double beep sequence
    const now = audioContext.currentTime;
    beep(now, 880, 0.4); // First beep
    beep(now + 0.5, 880, 0.4); // Second beep
  };

  // Helper to get duration for current mode
  const getDuration = useCallback((currentMode: TimerMode) => {
    switch (currentMode) {
      case TimerMode.POMODORO: return settings.pomodoroTime * 60;
      case TimerMode.SHORT_BREAK: return settings.shortBreakTime * 60;
      case TimerMode.LONG_BREAK: return settings.longBreakTime * 60;
      default: return 25 * 60;
    }
  }, [settings]);

  // Handle Mode Switching
  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getDuration(newMode));
  };

  // Handle Timer Completion
  const handleComplete = () => {
    playNotification();
    setIsActive(false);

    if (mode === TimerMode.POMODORO) {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      
      // Update active task stats
      if (activeTaskId) {
        setTasks(prev => prev.map(t => 
          t.id === activeTaskId ? { ...t, pomodoros: (t.pomodoros || 0) + 1 } : t
        ));
      }

      // Determine next break
      if (newCount % 4 === 0) {
        if (settings.autoStartBreaks) {
           setMode(TimerMode.LONG_BREAK);
           setTimeLeft(getDuration(TimerMode.LONG_BREAK));
           setIsActive(true);
        } else {
           switchMode(TimerMode.LONG_BREAK);
        }
      } else {
        if (settings.autoStartBreaks) {
           setMode(TimerMode.SHORT_BREAK);
           setTimeLeft(getDuration(TimerMode.SHORT_BREAK));
           setIsActive(true);
        } else {
           switchMode(TimerMode.SHORT_BREAK);
        }
      }
    } else {
      // Break is over, back to Pomodoro
      if (settings.autoStartPomodoros) {
         setMode(TimerMode.POMODORO);
         setTimeLeft(getDuration(TimerMode.POMODORO));
         setIsActive(true);
      } else {
         switchMode(TimerMode.POMODORO);
      }
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, settings.ecoMode]); 

  // Update timeLeft when settings change (if timer not running)
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getDuration(mode));
    }
  }, [settings.pomodoroTime, settings.shortBreakTime, settings.longBreakTime]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getDuration(mode));
  };

  const allThemes = [...THEMES, ...customThemes];

  return (
    <div className="relative min-h-screen text-white transition-all duration-700 ease-in-out font-sans overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
           style={{ 
             backgroundImage: `url(${theme.bgImage})`,
             filter: `blur(${settings.backgroundBlur}px)`
           }}
         />
         {/* Slightly darker overlay for better contrast */}
         <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-[1800px] mx-auto px-6 py-8 md:p-12 overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-16 shrink-0">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white leading-none">ZenFocus</h1>
                <p className="text-xs text-white/50 font-medium tracking-widest mt-1.5 uppercase">AI Powered Pomodoro</p>
              </div>
           </div>
           
           <div className="flex items-center gap-8">
              <div className="hidden md:flex flex-col items-end">
                 <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Total Sessions</span>
                 <span className="text-2xl font-mono font-bold text-white">{sessionsCompleted}</span>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block"></div>
              <button 
                onClick={() => setShowSettings(true)}
                className="group p-4 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-95"
                aria-label="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 group-hover:opacity-100 transition-opacity"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
           </div>
        </header>

        {/* Main Grid: Changed to 10-column grid to make sides wider */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-10 xl:gap-16 items-start">
          
          {/* Left Column: Tasks (30%) */}
          <section className="lg:col-span-3 flex flex-col h-[650px] lg:h-[calc(100vh-200px)] sticky top-24">
             <TaskList 
               tasks={tasks} 
               setTasks={setTasks} 
               activeTaskId={activeTaskId} 
               setActiveTaskId={setActiveTaskId}
               apiKey={geminiApiKey}
             />
          </section>

          {/* Center Column: Timer (40%) */}
          <section className="lg:col-span-4 flex flex-col items-center py-4 lg:py-8 justify-start relative min-h-[600px]">
             
             {/* Mode Switcher */}
             <div className="flex bg-black/40 backdrop-blur-xl p-2 rounded-full mb-16 border border-white/10 shadow-2xl">
               {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map((m) => (
                 <button
                   key={m}
                   onClick={() => switchMode(m)}
                   className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${mode === m ? 'bg-white text-black shadow-lg scale-105' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                 >
                   {m === TimerMode.POMODORO ? 'Focus' : m === TimerMode.SHORT_BREAK ? 'Short Break' : 'Long Break'}
                 </button>
               ))}
             </div>

             <TimerDisplay 
               timeLeft={timeLeft}
               totalTime={getDuration(mode)}
               mode={mode}
               isActive={isActive}
               ecoMode={settings.ecoMode}
               onToggle={toggleTimer}
               onReset={resetTimer}
             />
             
             {/* Quick Tip / Status */}
             <div className="mt-16 text-center animate-fade-in max-w-md">
                <p className="text-white/40 text-sm font-medium tracking-wide">
                  {activeTaskId 
                    ? `Working on: ${tasks.find(t => t.id === activeTaskId)?.title}` 
                    : "Select a task from the list to track your focus"}
                </p>
             </div>
          </section>

          {/* Right Column: Media (30%) */}
          <section className="lg:col-span-3 flex flex-col h-[650px] lg:h-[calc(100vh-200px)] sticky top-24">
             <MediaPanel />
          </section>

        </main>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        currentTheme={theme}
        onUpdateTheme={setTheme}
        themes={allThemes}
        onAddCustomTheme={handleAddCustomTheme}
        onDeleteCustomTheme={handleDeleteCustomTheme}
        apiKey={geminiApiKey}
        onUpdateApiKey={setGeminiApiKey}
      />
    </div>
  );
};

export default App;