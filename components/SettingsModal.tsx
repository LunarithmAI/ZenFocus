
import React, { useState } from 'react';
import { Settings, Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  currentTheme: Theme;
  onUpdateTheme: (theme: Theme) => void;
  themes: Theme[];
  onAddCustomTheme: (theme: Theme) => void;
  onDeleteCustomTheme: (id: string) => void;
  apiKey: string;
  onUpdateApiKey: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentTheme,
  onUpdateTheme,
  themes,
  onAddCustomTheme,
  onDeleteCustomTheme,
  apiKey,
  onUpdateApiKey
}) => {
  if (!isOpen) return null;

  const [isAddingTheme, setIsAddingTheme] = useState(false);
  const [newThemeUrl, setNewThemeUrl] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleChange = (key: keyof Settings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("Image is too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewThemeUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTheme = () => {
    if (!newThemeUrl) return;
    const theme: Theme = {
      id: `custom-${Date.now()}`,
      name: newThemeName || `Custom Theme`,
      bgImage: newThemeUrl,
      primaryColor: 'bg-slate-700', // Default fallback
      textColor: 'text-white',
      isCustom: true
    };
    onAddCustomTheme(theme);
    setNewThemeUrl('');
    setNewThemeName('');
    setIsAddingTheme(false);
  };

  const handleSaveApiKey = () => {
    onUpdateApiKey(tempApiKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] text-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* API Key Section */}
          <section className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/20">
             <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M12 17v.01"/><path d="M17 12v.01"/></svg>
                <h3 className="text-xs uppercase font-bold text-purple-300 tracking-wider">AI Configuration</h3>
             </div>
             <p className="text-xs text-white/50 mb-3">
               Enter your <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Gemini API Key</a> to enable AI task breakdown.
             </p>
             <div className="flex gap-2">
                <div className="relative flex-1">
                   <input 
                     type={showApiKey ? "text" : "password"}
                     value={tempApiKey}
                     onChange={(e) => setTempApiKey(e.target.value)}
                     placeholder="Paste API Key here..."
                     className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors pr-8"
                   />
                   <button 
                     onClick={() => setShowApiKey(!showApiKey)}
                     className="absolute right-2 top-2 text-white/30 hover:text-white"
                   >
                     {showApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                     )}
                   </button>
                </div>
                <button 
                  onClick={handleSaveApiKey}
                  className="bg-purple-600 hover:bg-purple-500 px-4 rounded font-bold text-xs transition-colors"
                >
                  Save
                </button>
             </div>
             {apiKey && (
               <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">
                 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                 Key saved
               </div>
             )}
          </section>

          {/* Appearance Section */}
          <section>
            <h3 className="text-xs uppercase font-bold text-white/40 mb-4 tracking-wider">Appearance</h3>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-white/90 font-medium">Background Blur</label>
                    <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">{settings.backgroundBlur}px</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={settings.backgroundBlur}
                    onChange={(e) => handleChange('backgroundBlur', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-2">
                    <span>Sharp</span>
                    <span>Blurry</span>
                </div>
            </div>
          </section>

          {/* Timer Settings */}
          <section>
            <h3 className="text-xs uppercase font-bold text-white/40 mb-4 tracking-wider">Timer (minutes)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Pomodoro</label>
                <input 
                  type="number" 
                  value={settings.pomodoroTime} 
                  onChange={(e) => handleChange('pomodoroTime', parseInt(e.target.value) || 25)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Short Break</label>
                <input 
                  type="number" 
                  value={settings.shortBreakTime} 
                  onChange={(e) => handleChange('shortBreakTime', parseInt(e.target.value) || 5)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Long Break</label>
                <input 
                  type="number" 
                  value={settings.longBreakTime} 
                  onChange={(e) => handleChange('longBreakTime', parseInt(e.target.value) || 15)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/40"
                />
              </div>
            </div>
          </section>

          {/* Toggles */}
          <section className="space-y-3">
             <h3 className="text-xs uppercase font-bold text-white/40 mb-2 tracking-wider">Automation & Performance</h3>
             <div className="flex items-center justify-between">
                <span className="text-sm">Timer Alarm</span>
                <button 
                  onClick={() => handleChange('soundEnabled', !settings.soundEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm">Browser Notifications</span>
                <button 
                  onClick={() => handleChange('browserNotifications', !settings.browserNotifications)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.browserNotifications ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.browserNotifications ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm">Auto-start Breaks</span>
                <button 
                  onClick={() => handleChange('autoStartBreaks', !settings.autoStartBreaks)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoStartBreaks ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoStartBreaks ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm">Auto-start Pomodoros</span>
                <button 
                  onClick={() => handleChange('autoStartPomodoros', !settings.autoStartPomodoros)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoStartPomodoros ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoStartPomodoros ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <div>
                   <span className="text-sm block">Eco Mode</span>
                   <span className="text-xs text-white/40">Reduces animations to save CPU</span>
                </div>
                <button 
                  onClick={() => handleChange('ecoMode', !settings.ecoMode)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.ecoMode ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.ecoMode ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             <div className="flex items-center justify-between">
                <div>
                   <span className="text-sm block">Auto Picture-in-Picture</span>
                   <span className="text-xs text-white/40">Show timer in PiP when switching tabs</span>
                </div>
                <button 
                  onClick={() => handleChange('autoPiPEnabled', !settings.autoPiPEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoPiPEnabled ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoPiPEnabled ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
          </section>

          {/* Themes */}
          <section>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs uppercase font-bold text-white/40 tracking-wider">Theme</h3>
               <button 
                 onClick={() => setIsAddingTheme(!isAddingTheme)}
                 className="text-xs text-purple-400 hover:text-purple-300 font-bold"
               >
                 {isAddingTheme ? 'Cancel' : '+ Add Custom'}
               </button>
            </div>
            
            {isAddingTheme && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 animate-fade-in space-y-3">
                 <div>
                   <label className="text-xs text-white/60 mb-1 block">Theme Name</label>
                   <input 
                     type="text" 
                     value={newThemeName}
                     onChange={(e) => setNewThemeName(e.target.value)}
                     placeholder="My Awesome Theme"
                     className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-white/30"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-white/60 mb-1 block">Image Source</label>
                   <div className="flex flex-col gap-2">
                      <input 
                        type="text" 
                        value={newThemeUrl}
                        onChange={(e) => setNewThemeUrl(e.target.value)}
                        placeholder="Paste Image URL..."
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-white/30"
                      />
                      <div className="text-center text-xs text-white/30">- OR -</div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                      />
                   </div>
                 </div>
                 {newThemeUrl && (
                   <div className="h-24 w-full rounded-lg bg-cover bg-center border border-white/20" style={{backgroundImage: `url(${newThemeUrl})`}}></div>
                 )}
                 <button 
                   onClick={handleSaveTheme}
                   disabled={!newThemeUrl}
                   className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-sm transition-colors shadow-lg"
                 >
                   Save Theme
                 </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {themes.map(theme => (
                <div key={theme.id} className="relative group">
                  <button
                    onClick={() => onUpdateTheme(theme)}
                    className={`relative w-full h-20 rounded-lg overflow-hidden border-2 transition-all ${currentTheme.id === theme.id ? 'border-white ring-2 ring-white/20' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={theme.bgImage} alt={theme.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-sm font-medium drop-shadow-md">{theme.name}</span>
                    </div>
                  </button>
                  {theme.isCustom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteCustomTheme(theme.id); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                      title="Delete Theme"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;