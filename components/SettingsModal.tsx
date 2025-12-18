
import React, { useState } from 'react';
import { Settings, Theme, AIModelConfig } from '../types';

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
  modelConfig: AIModelConfig;
  onUpdateModelConfig: (config: AIModelConfig) => void;
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
  onUpdateApiKey,
  modelConfig,
  onUpdateModelConfig
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'general' | 'llm'>('general');
  const [isAddingTheme, setIsAddingTheme] = useState(false);
  const [newThemeUrl, setNewThemeUrl] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempModelId, setTempModelId] = useState(modelConfig.modelId);
  const [tempPrompt, setTempPrompt] = useState(modelConfig.customPrompt);
  const [tempProvider, setTempProvider] = useState<'gemini' | 'openai-compatible'>(modelConfig.provider || 'gemini');
  const [tempApiBaseUrl, setTempApiBaseUrl] = useState(modelConfig.apiBaseUrl || '');
  const [tempSupportsStructuredOutput, setTempSupportsStructuredOutput] = useState(modelConfig.supportsStructuredOutput ?? true);

  const handleChange = (key: keyof Settings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions for 4K theme backgrounds
          const MAX_WIDTH = 3840;
          const MAX_HEIGHT = 2160;
          
          // Scale down if needed (rescaling)
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // JPEG compression with adaptive quality
          // Start with high quality and reduce if data URL is too large
          let quality = 0.92;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Progressive quality reduction if still too large
          // Target: keep under reasonable size for localStorage
          while (dataUrl.length > 5 * 1024 * 1024 && quality > 0.5) {
            quality -= 0.05;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setNewThemeUrl(compressedDataUrl);
      } catch (error) {
        console.error('Failed to process image:', error);
        alert("Failed to process image. Please try another file.");
      }
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

  const handleSaveModelConfig = () => {
    onUpdateModelConfig({
      modelId: tempModelId,
      customPrompt: tempPrompt,
      provider: tempProvider,
      apiBaseUrl: tempApiBaseUrl,
      supportsStructuredOutput: tempSupportsStructuredOutput
    });
  };

  const handleResetPrompt = () => {
    const defaultPrompt = 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.';
    setTempPrompt(defaultPrompt);
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

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'llm' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            LLM
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          
          {activeTab === 'llm' && (
            <>
              {/* API Key Section */}
              <section className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/20">
                 <div className="flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M12 17v.01"/><path d="M17 12v.01"/></svg>
                    <h3 className="text-xs uppercase font-bold text-purple-300 tracking-wider">API Configuration</h3>
                 </div>
                 <p className="text-xs text-white/50 mb-3">
                   {tempProvider === 'gemini' 
                     ? <>Enter your <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Gemini API Key</a> to enable AI task breakdown.</>
                     : 'Enter your OpenAI-compatible API key to enable AI task breakdown.'
                   }
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

              {/* AI Model Configuration Section */}
              <section className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/20">
                 <div className="flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    <h3 className="text-xs uppercase font-bold text-purple-300 tracking-wider">Model Configuration</h3>
                 </div>
                 
                 {/* Provider Selection */}
                 <div className="mb-4">
                    <label className="text-xs text-white/60 mb-1 block">Provider</label>
                    <select 
                      value={tempProvider}
                      onChange={(e) => setTempProvider(e.target.value as 'gemini' | 'openai-compatible')}
                      className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai-compatible">OpenAI-Compatible</option>
                    </select>
                 </div>

                 {/* API Base URL (for OpenAI-compatible) */}
                 {tempProvider === 'openai-compatible' && (
                   <div className="mb-4">
                      <label className="text-xs text-white/60 mb-1 block">API Base URL</label>
                      <input 
                        type="text"
                        value={tempApiBaseUrl}
                        onChange={(e) => setTempApiBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
                      />
                      <p className="text-[10px] text-white/40 mt-1">
                        Base URL for your OpenAI-compatible API endpoint
                      </p>
                   </div>
                 )}

                 {/* Model ID Input */}
                 <div className="mb-4">
                    <label className="text-xs text-white/60 mb-1 block">Model ID</label>
                    <input 
                      type="text"
                      value={tempModelId}
                      onChange={(e) => setTempModelId(e.target.value)}
                      placeholder={tempProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o'}
                      className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <p className="text-[10px] text-white/40 mt-1">
                      {tempProvider === 'gemini' 
                        ? 'Examples: gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash'
                        : 'Examples: gpt-4o, gpt-4-turbo, gpt-3.5-turbo'
                      }
                    </p>
                 </div>

                 {/* Structured Output Toggle */}
                 <div className="mb-4">
                    <div className="flex items-center justify-between bg-black/20 border border-white/10 rounded px-3 py-2">
                       <div>
                          <span className="text-sm block">Supports Structured Output</span>
                          <span className="text-xs text-white/40">Disable if model doesn't support JSON schema</span>
                       </div>
                       <button 
                         onClick={() => setTempSupportsStructuredOutput(!tempSupportsStructuredOutput)}
                         className={`w-12 h-6 rounded-full relative transition-colors ${tempSupportsStructuredOutput ? 'bg-green-500' : 'bg-white/20'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${tempSupportsStructuredOutput ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>

                 {/* Custom Prompt Input */}
                 <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                       <label className="text-xs text-white/60">Custom Prompt Template</label>
                       <button 
                         onClick={handleResetPrompt}
                         className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                       >
                         Reset to Default
                       </button>
                    </div>
                    <textarea 
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      placeholder='Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.'
                      rows={4}
                      className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors resize-none"
                    />
                    <p className="text-[10px] text-white/40 mt-1">
                      Use {'{goal}'} as a placeholder for the user's input goal
                    </p>
                 </div>

                 <button 
                   onClick={handleSaveModelConfig}
                   className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded font-bold text-xs transition-colors"
                 >
                   Save Model Settings
                 </button>
                 {modelConfig.modelId && (
                   <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">
                     <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                     Model settings saved
                   </div>
                 )}
              </section>
            </>
          )}

          {activeTab === 'general' && (
            <>
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
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <label className="block text-sm text-white/70 mb-2">Long Break Interval</label>
              <input 
                type="number" 
                min="1"
                max="10"
                value={settings.longBreakInterval} 
                onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value) || 4)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/40"
              />
              <p className="text-xs text-white/40 mt-2">Number of pomodoros before a long break (default: 4)</p>
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
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;