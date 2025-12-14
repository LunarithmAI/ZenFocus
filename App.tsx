
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, Task, Settings, Theme, AIModelConfig } from './types';
import { DEFAULT_SETTINGS, THEMES } from './constants';
import TimerDisplay from './components/TimerDisplay';
import TaskList from './components/TaskList';
import MediaPanel from './components/MediaPanel';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  // State: Settings
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const savedSettings = localStorage.getItem('zenfocus_settings');
      if (savedSettings) {
        // Merge with defaults to ensure new fields are present
        return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('zenfocus_settings', JSON.stringify(settings));
  }, [settings]);
  
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

  // State: AI Model Configuration
  const [modelConfig, setModelConfig] = useState<AIModelConfig>(() => {
    try {
      const saved = localStorage.getItem('zenfocus_model_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load model config", e);
    }
    return {
      modelId: 'gemini-2.5-flash',
      customPrompt: 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.'
    };
  });

  // Save model config when it changes
  useEffect(() => {
    localStorage.setItem('zenfocus_model_config', JSON.stringify(modelConfig));
  }, [modelConfig]);

  // Request Notification Permission on Mount if enabled
  useEffect(() => {
    if (settings.browserNotifications && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [settings.browserNotifications]);

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

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedId = localStorage.getItem('zenfocus_active_theme_id');
      if (savedId) {
        const allThemes = [...THEMES, ...customThemes];
        const found = allThemes.find(t => t.id === savedId);
        if (found) return found;
      }
    } catch (e) {
      console.error("Failed to load active theme", e);
    }
    return THEMES[0];
  });

  const [showSettings, setShowSettings] = useState(false);

  // Save custom themes to local storage
  useEffect(() => {
    localStorage.setItem('zenfocus_custom_themes', JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(() => {
    localStorage.setItem('zenfocus_active_theme_id', theme.id);
  }, [theme]);

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

  // Refs for timer interval and PiP
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

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

    // Trigger Browser Notification
    if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      const title = mode === TimerMode.POMODORO ? 'Focus Session Complete!' : 'Break Over!';
      const body = mode === TimerMode.POMODORO 
        ? 'Great job! Time to take a break.' 
        : 'Break is finished. Ready to focus?';
      
      new Notification(title, { body });
    }

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

  // Picture-in-Picture - Cleanup when setting disabled
  useEffect(() => {
    if (!settings.autoPiPEnabled && pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
  }, [settings.autoPiPEnabled]);

  // Picture-in-Picture - Update content when timer/mode changes
  useEffect(() => {
    if (!settings.autoPiPEnabled || !pipWindowRef.current) return;

    const pipWindow = pipWindowRef.current;
    const container = pipWindow.document.getElementById('pip-container');
    if (!container) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let modeLabel = '';
    let modeColor = '';
    let strokeColor = '';
    switch(mode) {
      case TimerMode.POMODORO:
        modeLabel = 'FOCUS TIME';
        modeColor = '#f87171';
        strokeColor = 'rgb(248, 113, 113)';
        break;
      case TimerMode.SHORT_BREAK:
        modeLabel = 'SHORT BREAK';
        modeColor = '#5eead4';
        strokeColor = 'rgb(94, 234, 212)';
        break;
      case TimerMode.LONG_BREAK:
        modeLabel = 'LONG BREAK';
        modeColor = '#60a5fa';
        strokeColor = 'rgb(96, 165, 250)';
        break;
    }

    // Calculate progress for circle
    const totalTime = getDuration(mode);
    const progress = timeLeft / totalTime;
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%;">
        <!-- Mode Switcher -->
        <div style="display: flex; background: rgba(0,0,0,0.4); backdrop-filter: blur(20px); padding: 5px; border-radius: 999px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1); gap: 3px;">
          <button id="pip-pomodoro" style="padding: 7px 16px; border-radius: 999px; font-size: 10px; font-weight: bold; transition: all 0.3s; border: none; cursor: pointer; ${mode === TimerMode.POMODORO ? 'background: white; color: black; transform: scale(1.05);' : 'background: transparent; color: rgba(255,255,255,0.5);'}">
            Focus
          </button>
          <button id="pip-short" style="padding: 7px 13px; border-radius: 999px; font-size: 10px; font-weight: bold; transition: all 0.3s; border: none; cursor: pointer; ${mode === TimerMode.SHORT_BREAK ? 'background: white; color: black; transform: scale(1.05);' : 'background: transparent; color: rgba(255,255,255,0.5);'}">
            Short Break
          </button>
          <button id="pip-long" style="padding: 7px 13px; border-radius: 999px; font-size: 10px; font-weight: bold; transition: all 0.3s; border: none; cursor: pointer; ${mode === TimerMode.LONG_BREAK ? 'background: white; color: black; transform: scale(1.05);' : 'background: transparent; color: rgba(255,255,255,0.5);'}">
            Long Break
          </button>
        </div>

        <!-- Circular Timer -->
        <div style="position: relative; width: 260px; height: 260px; margin-bottom: 0px;">
          <svg width="260" height="260" style="transform: rotate(-90deg);">
            <!-- Background Circle -->
            <circle cx="130" cy="130" r="115" stroke="currentColor" stroke-width="5" fill="transparent" style="color: rgba(255,255,255,0.05);" />
            <!-- Progress Circle -->
            <circle cx="130" cy="130" r="115" stroke="${strokeColor}" stroke-width="5" fill="transparent" stroke-dasharray="${circumference * (115/radius)}" stroke-dashoffset="${dashOffset * (115/radius)}" stroke-linecap="round" style="transition: stroke-dashoffset 1s linear;" />
          </svg>
          
          <!-- Timer Content Overlay -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
            <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2.5px; opacity: 0.5; margin-bottom: 12px;">${modeLabel}</div>
            <div style="font-size: 52px; font-weight: bold; font-family: monospace; line-height: 1; margin-bottom: 18px; letter-spacing: -2px;">${formattedTime}</div>
            
            <!-- Control Buttons -->
            <div style="display: flex; align-items: center; gap: 10px;">
              <button id="pip-toggle" style="background: white; color: black; padding: 9px 26px; border-radius: 999px; font-weight: bold; cursor: pointer; font-size: 12px; transition: all 0.2s; border: none; box-shadow: 0 0 20px rgba(255,255,255,0.2);">
                ${isActive ? 'Pause' : 'Start'}
              </button>
              <button id="pip-reset" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); color: white; padding: 9px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const toggleBtn = container.querySelector('#pip-toggle');
    const resetBtn = container.querySelector('#pip-reset');
    const pomodoroBtn = container.querySelector('#pip-pomodoro');
    const shortBtn = container.querySelector('#pip-short');
    const longBtn = container.querySelector('#pip-long');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => toggleTimer());
      toggleBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.9)';
        (e.target as HTMLElement).style.transform = 'scale(1.05)';
      });
      toggleBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.background = 'white';
        (e.target as HTMLElement).style.transform = 'scale(1)';
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => resetTimer());
      resetBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
        (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
      });
      resetBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
        (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
      });
    }

    const setupModeButton = (btn: Element | null, targetMode: TimerMode) => {
      if (!btn) return;
      btn.addEventListener('click', () => switchMode(targetMode));
      if (mode !== targetMode) {
        btn.addEventListener('mouseenter', (e) => {
          (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
        });
        btn.addEventListener('mouseleave', (e) => {
          (e.target as HTMLElement).style.background = 'transparent';
        });
      }
    };

    setupModeButton(pomodoroBtn, TimerMode.POMODORO);
    setupModeButton(shortBtn, TimerMode.SHORT_BREAK);
    setupModeButton(longBtn, TimerMode.LONG_BREAK);
  }, [settings.autoPiPEnabled, timeLeft, mode, isActive, toggleTimer, resetTimer, switchMode, getDuration]);

  // Picture-in-Picture - Handle visibility changes
  useEffect(() => {
    if (!settings.autoPiPEnabled) return;

    const documentPiP = (window as any).documentPictureInPicture;
    if (!documentPiP) return;

    const openPiP = async () => {
      if (pipWindowRef.current) return; // Already open

      try {
        // Open new PiP window - compact size
        const pipWindow = await documentPiP.requestWindow({
          width: 360,
          height: 420,
        });

        pipWindowRef.current = pipWindow;

        // Style html and body elements
        pipWindow.document.documentElement.style.cssText = `
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        `;

        // Set background with current theme
        pipWindow.document.body.style.cssText = `
          margin: 0; 
          padding: 0; 
          overflow: hidden; 
          background-image: url('${theme.bgImage}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          width: 100%;
          height: 100%;
        `;

        // Add dark overlay
        const overlay = pipWindow.document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); z-index: 1;';
        pipWindow.document.body.appendChild(overlay);

        // Create PiP content container
        const container = pipWindow.document.createElement('div');
        container.id = 'pip-container';
        container.style.cssText = 'position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: system-ui; padding: 20px; box-sizing: border-box;';
        
        pipWindow.document.body.appendChild(container);

        // Handle PiP window close
        pipWindow.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
        });

      } catch (error) {
        console.error('Failed to open PiP:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !pipWindowRef.current) {
        openPiP();
      } else if (!document.hidden && pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };
  }, [settings.autoPiPEnabled, theme]);

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
                modelConfig={modelConfig}
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
        modelConfig={modelConfig}
        onUpdateModelConfig={setModelConfig}
      />
    </div>
  );
};

export default App;