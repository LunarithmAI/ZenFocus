
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
  longBreakInterval: number; // How many pomodoros before long break
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  ecoMode: boolean; // Low CPU mode
  backgroundBlur: number; // pixels
  soundEnabled: boolean;
  browserNotifications: boolean;
  autoPiPEnabled: boolean; // Auto Picture-in-Picture when tab is hidden
}

export interface AIModelConfig {
  modelId: string; // e.g., "gemini-2.5-flash", "gemini-1.5-pro", etc.
  customPrompt: string; // Custom prompt template for task breakdown
  provider: 'gemini' | 'openai-compatible'; // AI provider type
  apiBaseUrl?: string; // Base URL for OpenAI-compatible API
  supportsStructuredOutput: boolean; // Whether model supports structured output
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