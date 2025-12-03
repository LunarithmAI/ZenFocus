import React, { useState } from 'react';
import { MediaType } from '../types';
import { YOUTUBE_PLAYLISTS, SPOTIFY_PLAYLISTS } from '../constants';

interface MediaPanelProps {
  // empty for now
}

const MediaPanel: React.FC<MediaPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<MediaType>(MediaType.NONE);
  const [selectedId, setSelectedId] = useState<string>('');
  
  // State for Custom URL input
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  
  // Local state for playlists (initialized with constants, but extendable)
  const [youtubeLists, setYoutubeLists] = useState(YOUTUBE_PLAYLISTS);
  const [spotifyLists, setSpotifyLists] = useState(SPOTIFY_PLAYLISTS);

  // Default to first item if switching tabs
  const handleTabChange = (type: MediaType) => {
    setActiveTab(type);
    setCustomError('');
    setCustomInput('');
    if (type === MediaType.YOUTUBE && !selectedId && youtubeLists.length > 0) setSelectedId(youtubeLists[0].id);
    else if (type === MediaType.SPOTIFY && !selectedId && spotifyLists.length > 0) setSelectedId(spotifyLists[0].id);
    else if (type === MediaType.NONE) setSelectedId('');
  };

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    setCustomError('');

    if (activeTab === MediaType.YOUTUBE) {
      // Regex to extract video ID from various YouTube URL formats
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = customInput.match(regExp);

      if (match && match[2].length === 11) {
        const id = match[2];
        const newRef = { id, name: `Custom Video ${youtubeLists.length + 1}` };
        setYoutubeLists(prev => [newRef, ...prev]); // Add to top
        setSelectedId(id);
        setCustomInput('');
      } else {
        setCustomError('Invalid YouTube URL');
      }
    } else if (activeTab === MediaType.SPOTIFY) {
      // Regex to extract playlist/album/track ID
      // Supports open.spotify.com/playlist/ID
      const regExp = /open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
      const match = customInput.match(regExp);

      if (match && match[2]) {
        const id = match[2];
        const newRef = { id, name: `Custom Playlist ${spotifyLists.length + 1}` };
        setSpotifyLists(prev => [newRef, ...prev]);
        setSelectedId(id);
        setCustomInput('');
      } else {
        setCustomError('Invalid Spotify URL (Use "Share > Copy link to playlist")');
      }
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 text-white border border-white/10 h-full flex flex-col shadow-2xl">
       <div className="flex items-center gap-3 mb-8 text-white/90">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/5">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Audio Focus</h3>
            <p className="text-xs text-white/50">Ambient sounds</p>
          </div>
       </div>

       <div className="grid grid-cols-3 gap-3 mb-8 p-1.5 bg-black/40 rounded-2xl border border-white/5">
         <button 
           onClick={() => handleTabChange(MediaType.NONE)}
           className={`py-2.5 text-sm rounded-xl transition-all font-semibold ${activeTab === MediaType.NONE ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
         >
           Off
         </button>
         <button 
           onClick={() => handleTabChange(MediaType.SPOTIFY)}
           className={`py-2.5 text-sm rounded-xl transition-all flex items-center justify-center gap-2 font-semibold ${activeTab === MediaType.SPOTIFY ? 'bg-[#1DB954]/20 text-[#1DB954] shadow-md border border-[#1DB954]/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
         >
           <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
           Spotify
         </button>
         <button 
           onClick={() => handleTabChange(MediaType.YOUTUBE)}
           className={`py-2.5 text-sm rounded-xl transition-all flex items-center justify-center gap-2 font-semibold ${activeTab === MediaType.YOUTUBE ? 'bg-[#FF0000]/20 text-[#FF0000] shadow-md border border-[#FF0000]/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
         >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
           YouTube
         </button>
       </div>

       <div className="flex-1 flex flex-col">
          {activeTab === MediaType.NONE && (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm italic min-h-[200px] border-2 border-dashed border-white/5 rounded-2xl bg-white/5 p-8 text-center">
               <div className="mb-4 opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/><path d="M2 18v2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>
               </div>
               <span className="mb-1 font-medium text-white/60">Silence is golden</span>
               <span className="text-xs opacity-50">Select a music source to play in the background</span>
            </div>
          )}

          {(activeTab === MediaType.SPOTIFY || activeTab === MediaType.YOUTUBE) && (
            <div className="animate-fade-in flex-1 flex flex-col gap-6">
              
              {/* Custom Input Section */}
              <div className="flex gap-2">
                 <div className="relative flex-1">
                   <input
                     type="text"
                     value={customInput}
                     onChange={(e) => setCustomInput(e.target.value)}
                     placeholder={activeTab === MediaType.YOUTUBE ? "Paste YouTube URL..." : "Paste Spotify Playlist Link..."}
                     className={`w-full bg-white/5 border ${customError ? 'border-red-400' : 'border-white/10'} text-white text-xs p-3 rounded-xl outline-none focus:border-white/30 transition-colors`}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                   />
                   {customError && <span className="absolute -bottom-5 left-1 text-[10px] text-red-400">{customError}</span>}
                 </div>
                 <button 
                    onClick={handleAddCustom}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 </button>
              </div>

              <div>
                 <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block ml-1">
                   {activeTab === MediaType.SPOTIFY ? 'Select Playlist' : 'Select Video'}
                 </label>
                 <select 
                   value={selectedId}
                   onChange={(e) => setSelectedId(e.target.value)}
                   className="w-full bg-white/5 border border-white/10 text-white text-sm p-4 rounded-xl outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-white/10 appearance-none"
                 >
                    {activeTab === MediaType.SPOTIFY 
                      ? spotifyLists.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)
                      : youtubeLists.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)
                    }
                 </select>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-xl relative min-h-[220px]">
                {activeTab === MediaType.SPOTIFY && selectedId && (
                    <iframe 
                      src={`https://open.spotify.com/embed/playlist/${selectedId}?utm_source=generator&theme=0`} 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      loading="lazy"
                      className="absolute inset-0"
                    ></iframe>
                )}
                {activeTab === MediaType.YOUTUBE && selectedId && (
                   <iframe 
                     width="100%" 
                     height="100%" 
                     src={`https://www.youtube.com/embed/${selectedId}?origin=${window.location.origin}`} 
                     title="YouTube video player" 
                     frameBorder="0" 
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                     allowFullScreen
                     className="absolute inset-0"
                   ></iframe>
                )}
              </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default MediaPanel;