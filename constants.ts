
import { TimerMode, Theme } from './types';

const themeAsset = (filename: string) => `${import.meta.env.BASE_URL}themes/${filename}`;

export const DEFAULT_SETTINGS = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  ecoMode: true,
  backgroundBlur: 0,
  soundEnabled: true,
  browserNotifications: true,
  autoPiPEnabled: true,
};

export const THEMES: Theme[] = [
  {
    id: 'lofi-rain',
    name: 'Lofi Rain',
    bgImage: themeAsset('lofi-rain.webp'),
    primaryColor: 'bg-indigo-500',
    textColor: 'text-white',
  },
  {
    id: 'forest-zen',
    name: 'Forest Zen',
    bgImage: themeAsset('forest-zen.webp'),
    primaryColor: 'bg-emerald-600',
    textColor: 'text-emerald-50',
  },
  {
    id: 'minimal-dark',
    name: 'Deep Focus',
    bgImage: themeAsset('deep-focus.webp'),
    primaryColor: 'bg-slate-700',
    textColor: 'text-slate-100',
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    bgImage: themeAsset('coffee-shop.webp'),
    primaryColor: 'bg-orange-800',
    textColor: 'text-orange-50',
  },
];

// Updated with currently stable live stream IDs and playlists
export const YOUTUBE_PLAYLISTS = [
  { id: '5yx6BWlEVcY', name: 'Chillhop - Jazzy/Lofi' },
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl - Beats to Relax/Study' },
  { id: 'lP26UCnoHg', name: 'Coffee Shop Jazz' },
  { id: '4xDzrJKXOOY', name: 'Synthwave Radio' },
  { id: 'playlist_PLwR9oHZKaCC2Aae_c1E36xOWYS96p_I4y', name: 'Lofi Hip Hop Playlist' },
  { id: 'playlist_PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo', name: 'Ambient Study Music' },
];

export const SPOTIFY_PLAYLISTS = [
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lofi Beats' },
  { id: '37i9dQZF1DX8Uebhn9wzrS', name: 'Chill Lofi Study Beats' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus' },
];

export const SOUNDCLOUD_PLAYLISTS = [
  {
    id: 'https://soundcloud.com/lematworks/sets/flow',
    name: 'Flow State — Deep Focus'
  },
  {
    id: 'https://soundcloud.com/yacha-toueg/sets/ambient-focus-sets',
    name: 'Ambient Focus'
  }
];