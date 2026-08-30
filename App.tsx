
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { TimerMode } from './types';
import type { AIModelConfig, Settings, Task, Theme } from './types';
import { DEFAULT_SETTINGS, THEMES } from './constants';
import TimerDisplay from './components/TimerDisplay';
import TaskList from './components/TaskList';
import MediaPanel from './components/MediaPanel';
import SettingsModal from './components/SettingsModal';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options: { width: number; height: number }) => Promise<Window>;
    };
  }
}

const App: FC = () => {
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
      customPrompt: 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.',
      provider: 'gemini',
      supportsStructuredOutput: true
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

  const handleAddCustomTheme = useCallback((newTheme: Theme) => {
    setCustomThemes(prev => [...prev, newTheme]);
    setTheme(newTheme);
  }, []);

  const handleDeleteCustomTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => prev.filter(candidate => candidate.id !== themeId));
    if (theme.id === themeId) {
      setTheme(THEMES[0]);
    }
  }, [theme.id]);

  // State: Timer
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // State: Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Refs for accurate timer scheduling, PiP, and the reusable notification audio graph.
  const timerDeadlineRef = useRef<number | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const updatePiPRef = useRef<() => void>(() => {});
  const wakeTimerRef = useRef<() => void>(() => {});

  const playNotification = useCallback(() => {
    if (!settings.soundEnabled) return;

    const audioContext = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = audioContext;
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const beep = (startTime: number, frequency: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.addEventListener('ended', () => {
        oscillator.disconnect();
        gainNode.disconnect();
      }, { once: true });
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    beep(now, 880, 0.4);
    beep(now + 0.5, 880, 0.4);
  }, [settings.soundEnabled]);

  useEffect(() => () => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Helper to get duration for current mode
  const getDuration = useCallback((currentMode: TimerMode) => {
    switch (currentMode) {
      case TimerMode.POMODORO: return settings.pomodoroTime * 60;
      case TimerMode.SHORT_BREAK: return settings.shortBreakTime * 60;
      case TimerMode.LONG_BREAK: return settings.longBreakTime * 60;
      default: return 25 * 60;
    }
  }, [settings.longBreakTime, settings.pomodoroTime, settings.shortBreakTime]);

  const switchMode = useCallback((newMode: TimerMode) => {
    timerDeadlineRef.current = null;
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getDuration(newMode));
  }, [getDuration]);

  const handleComplete = useCallback(() => {
    timerDeadlineRef.current = null;
    playNotification();
    setIsActive(false);

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

      if (activeTaskId) {
        setTasks(prev => prev.map(task =>
          task.id === activeTaskId
            ? { ...task, pomodoros: (task.pomodoros || 0) + 1 }
            : task
        ));
      }

      const nextMode = newCount % settings.longBreakInterval === 0
        ? TimerMode.LONG_BREAK
        : TimerMode.SHORT_BREAK;
      if (settings.autoStartBreaks) {
        const nextDuration = getDuration(nextMode);
        timerDeadlineRef.current = Date.now() + nextDuration * 1000;
        setMode(nextMode);
        setTimeLeft(nextDuration);
        setIsActive(true);
        wakeTimerRef.current();
      } else {
        switchMode(nextMode);
      }
      return;
    }

    if (settings.autoStartPomodoros) {
      const nextDuration = getDuration(TimerMode.POMODORO);
      timerDeadlineRef.current = Date.now() + nextDuration * 1000;
      setMode(TimerMode.POMODORO);
      setTimeLeft(nextDuration);
      setIsActive(true);
      wakeTimerRef.current();
    } else {
      switchMode(TimerMode.POMODORO);
    }
  }, [
    activeTaskId,
    getDuration,
    mode,
    playNotification,
    sessionsCompleted,
    settings.autoStartBreaks,
    settings.autoStartPomodoros,
    settings.browserNotifications,
    settings.longBreakInterval,
    switchMode
  ]);

  useEffect(() => {
    if (!isActive) return;

    if (timerDeadlineRef.current === null) {
      timerDeadlineRef.current = Date.now() + timeLeft * 1000;
    }

    let timeoutId: number | undefined;
    const tick = () => {
      const deadline = timerDeadlineRef.current;
      if (deadline === null) return;

      const remainingMilliseconds = Math.max(0, deadline - Date.now());
      const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
      setTimeLeft(previous => previous === remainingSeconds ? previous : remainingSeconds);

      if (remainingSeconds === 0) return;
      const hiddenWithoutPiP = document.hidden && !pipWindowRef.current;
      const delay = hiddenWithoutPiP
        ? remainingMilliseconds
        : Math.max(50, remainingMilliseconds % 1000 || 1000);
      timeoutId = window.setTimeout(tick, delay);
    };
    const wakeTimer = () => {
      window.clearTimeout(timeoutId);
      tick();
    };

    wakeTimerRef.current = wakeTimer;
    tick();
    document.addEventListener('visibilitychange', wakeTimer);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', wakeTimer);
      wakeTimerRef.current = () => {};
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive && timeLeft === 0) {
      handleComplete();
    }
  }, [handleComplete, isActive, timeLeft]);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getDuration(mode));
    }
  }, [getDuration, isActive, mode]);

  const toggleTimer = useCallback(() => {
    if (isActive) {
      timerDeadlineRef.current = null;
      setIsActive(false);
      return;
    }

    timerDeadlineRef.current = Date.now() + timeLeft * 1000;
    setIsActive(true);
  }, [isActive, timeLeft]);

  const resetTimer = useCallback(() => {
    timerDeadlineRef.current = null;
    setIsActive(false);
    setTimeLeft(getDuration(mode));
  }, [getDuration, mode]);

  // Picture-in-Picture - Cleanup when setting disabled
  useEffect(() => {
    if (!settings.autoPiPEnabled && pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
  }, [settings.autoPiPEnabled]);

  // Picture-in-Picture - Update content when timer/mode changes
  const updatePiP = useCallback(() => {
    if (!settings.autoPiPEnabled || !pipWindowRef.current) return;

    const container = pipWindowRef.current.document.getElementById('pip-container');
    pipWindowRef.current.document.body.style.backgroundImage = `url("${theme.bgImage}")`;
    if (!container) return;

    if (!container.querySelector('#pip-time')) {
      container.innerHTML = `
        <style>
          #pip-container button { font: inherit; }
          #pip-container button:hover { filter: brightness(0.9); }
          #pip-container button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
        </style>
        <div style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%">
          <div style="display:flex;background:rgba(0,0,0,.65);padding:5px;border-radius:999px;margin-bottom:25px;border:1px solid rgba(255,255,255,.1);gap:3px">
            <button id="pip-pomodoro" style="padding:7px 16px;border-radius:999px;font-size:10px;font-weight:700;transition:transform .2s,background-color .2s;border:none;cursor:pointer">Focus</button>
            <button id="pip-short" style="padding:7px 13px;border-radius:999px;font-size:10px;font-weight:700;transition:transform .2s,background-color .2s;border:none;cursor:pointer">Short Break</button>
            <button id="pip-long" style="padding:7px 13px;border-radius:999px;font-size:10px;font-weight:700;transition:transform .2s,background-color .2s;border:none;cursor:pointer">Long Break</button>
          </div>
          <div style="position:relative;width:260px;height:260px">
            <svg width="260" height="260" style="transform:rotate(-90deg)" aria-hidden="true">
              <circle cx="130" cy="130" r="125" stroke="rgba(255,255,255,.05)" stroke-width="5" fill="transparent"></circle>
              <circle id="pip-progress" cx="130" cy="130" r="125" stroke-width="5" fill="transparent" stroke-linecap="round"></circle>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white">
              <div id="pip-mode-label" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;opacity:.5;margin-bottom:12px"></div>
              <div id="pip-time" style="font-size:52px;font-weight:700;font-family:ui-monospace,monospace;line-height:1;margin-bottom:18px;letter-spacing:-2px;font-variant-numeric:tabular-nums"></div>
              <div id="pip-task" style="margin-bottom:16px;text-align:center;max-width:200px">
                <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;opacity:.6;margin-bottom:6px">Working On</div>
                <div id="pip-task-name" style="font-size:13px;font-weight:600;line-height:1.3;background:rgba(255,255,255,.12);padding:8px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.15);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <button id="pip-toggle" style="background:white;color:black;padding:9px 26px;border-radius:999px;font-weight:700;cursor:pointer;font-size:12px;transition:transform .2s,filter .2s;border:none"></button>
                <button id="pip-reset" aria-label="Reset timer" style="background:rgba(255,255,255,.12);color:white;padding:9px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.12);transition:background-color .2s;width:38px;height:38px;display:flex;align-items:center;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const activeTaskName = activeTaskId
      ? tasks.find(task => task.id === activeTaskId)?.title ?? ''
      : '';
    const modeDetails = {
      [TimerMode.POMODORO]: { label: 'FOCUS TIME', stroke: 'rgb(248, 113, 113)' },
      [TimerMode.SHORT_BREAK]: { label: 'SHORT BREAK', stroke: 'rgb(94, 234, 212)' },
      [TimerMode.LONG_BREAK]: { label: 'LONG BREAK', stroke: 'rgb(96, 165, 250)' }
    }[mode];
    const circumference = 2 * Math.PI * 125;
    const dashOffset = circumference * (1 - timeLeft / getDuration(mode));

    const timeElement = container.querySelector<HTMLElement>('#pip-time');
    const labelElement = container.querySelector<HTMLElement>('#pip-mode-label');
    const progressElement = container.querySelector<SVGCircleElement>('#pip-progress');
    const taskElement = container.querySelector<HTMLElement>('#pip-task');
    const taskNameElement = container.querySelector<HTMLElement>('#pip-task-name');
    const toggleButton = container.querySelector<HTMLButtonElement>('#pip-toggle');
    const resetButton = container.querySelector<HTMLButtonElement>('#pip-reset');

    if (timeElement) timeElement.textContent = formattedTime;
    if (labelElement) labelElement.textContent = modeDetails.label;
    if (progressElement) {
      progressElement.setAttribute('stroke', modeDetails.stroke);
      progressElement.setAttribute('stroke-dasharray', circumference.toString());
      progressElement.setAttribute('stroke-dashoffset', dashOffset.toString());
      progressElement.style.transition = settings.ecoMode ? 'none' : 'stroke-dashoffset 1s linear';
    }
    if (taskElement) taskElement.hidden = !activeTaskName;
    if (taskNameElement) taskNameElement.textContent = activeTaskName;
    if (toggleButton) {
      toggleButton.textContent = isActive ? 'Pause' : 'Start';
      toggleButton.onclick = toggleTimer;
    }
    if (resetButton) resetButton.onclick = resetTimer;

    const configureModeButton = (id: string, targetMode: TimerMode) => {
      const button = container.querySelector<HTMLButtonElement>(id);
      if (!button) return;
      const selected = mode === targetMode;
      button.style.background = selected ? 'white' : 'transparent';
      button.style.color = selected ? 'black' : 'rgba(255,255,255,.55)';
      button.style.transform = selected ? 'scale(1.05)' : 'scale(1)';
      button.setAttribute('aria-pressed', selected.toString());
      button.onclick = () => switchMode(targetMode);
    };

    configureModeButton('#pip-pomodoro', TimerMode.POMODORO);
    configureModeButton('#pip-short', TimerMode.SHORT_BREAK);
    configureModeButton('#pip-long', TimerMode.LONG_BREAK);
  }, [
    activeTaskId,
    getDuration,
    isActive,
    mode,
    resetTimer,
    settings.autoPiPEnabled,
    settings.ecoMode,
    theme.bgImage,
    switchMode,
    tasks,
    timeLeft,
    toggleTimer
  ]);
  useEffect(() => {
    updatePiPRef.current = updatePiP;
    updatePiP();
  }, [updatePiP]);

  // Picture-in-Picture - Handle visibility changes
  useEffect(() => {
    if (!settings.autoPiPEnabled) return;

    const documentPiP = window.documentPictureInPicture;
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
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.68); z-index: 1;';
        pipWindow.document.body.appendChild(overlay);

        // Create PiP content container
        const container = pipWindow.document.createElement('div');
        container.id = 'pip-container';
        container.style.cssText = 'position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: system-ui; padding: 20px; box-sizing: border-box;';
        
        pipWindow.document.body.appendChild(container);
        updatePiPRef.current();
        wakeTimerRef.current();

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
  }, [settings.autoPiPEnabled]);

  const allThemes = useMemo(() => [...THEMES, ...customThemes], [customThemes]);
  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  return (
    <div className="relative min-h-screen text-white transition-all duration-700 ease-in-out font-sans overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-[background-image,filter,transform] duration-700"
           style={{
             backgroundImage: `url(${theme.bgImage})`,
             filter: settings.backgroundBlur > 0 ? `blur(${settings.backgroundBlur}px)` : undefined,
             transform: settings.backgroundBlur > 0 ? 'scale(1.05)' : undefined
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
                onClick={openSettings}
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
                {activeTaskId ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Working On</span>
                    <p className="text-white text-xl font-semibold tracking-wide bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-lg">
                      {tasks.find(t => t.id === activeTaskId)?.title}
                    </p>
                  </div>
                ) : (
                  <p className="text-white/40 text-sm font-medium tracking-wide">
                    Select a task from the list to track your focus
                  </p>
                )}
             </div>
          </section>

          {/* Right Column: Media (30%) */}
          <section className="lg:col-span-3 flex flex-col h-[650px] lg:h-[calc(100vh-200px)] sticky top-24">
             <MediaPanel />
          </section>

        </main>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={closeSettings}
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
      )}
    </div>
  );
};

export default App;