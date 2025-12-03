
import { TimerMode, Theme } from './types';

export const DEFAULT_SETTINGS = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  ecoMode: false,
  backgroundBlur: 0,
};

export const THEMES: Theme[] = [
  {
    id: 'lofi-rain',
    name: 'Lofi Rain',
    bgImage: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2574&auto=format&fit=crop',
    primaryColor: 'bg-indigo-500',
    textColor: 'text-white',
  },
  {
    id: 'forest-zen',
    name: 'Forest Zen',
    bgImage: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=2641&auto=format&fit=crop',
    primaryColor: 'bg-emerald-600',
    textColor: 'text-emerald-50',
  },
  {
    id: 'minimal-dark',
    name: 'Deep Focus',
    bgImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop',
    primaryColor: 'bg-slate-700',
    textColor: 'text-slate-100',
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    bgImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2671&auto=format&fit=crop',
    primaryColor: 'bg-orange-800',
    textColor: 'text-orange-50',
  },
];

// Updated with currently stable live stream IDs
export const YOUTUBE_PLAYLISTS = [
  { id: '5yx6BWlEVcY', name: 'Chillhop - Jazzy/Lofi' },
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl - Beats to Relax/Study' },
  { id: 'lP26UCnoHg', name: 'Coffee Shop Jazz' },
  { id: '4xDzrJKXOOY', name: 'Synthwave Radio' },
];

export const SPOTIFY_PLAYLISTS = [
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lofi Beats' },
  { id: '37i9dQZF1DX8Uebhn9wzrS', name: 'Chill Lofi Study Beats' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus' },
];
