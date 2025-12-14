
export enum TimerMode {
  POMODORO = 'pomodoro',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak',
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  pomodoros: number; // estimated or actual
}

export interface Settings {
  pomodoroTime: number; // in minutes
  shortBreakTime: number;
  longBreakTime: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  ecoMode: boolean; // Low CPU mode
  backgroundBlur: number; // pixels
  soundEnabled: boolean;
  browserNotifications: boolean;
  autoPiPEnabled: boolean; // Auto Picture-in-Picture when tab is hidden
}

export interface Theme {
  id: string;
  name: string;
  bgImage: string; // URL
  primaryColor: string; // Tailwind class mostly or hex
  textColor: string;
  isCustom?: boolean;
}

export enum MediaType {
  NONE = 'none',
  YOUTUBE = 'youtube',
  SPOTIFY = 'spotify',
}