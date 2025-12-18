import React, { useState } from 'react';
import { Task, AIModelConfig } from '../types';
import { breakDownTask } from '../services/geminiService';

interface TaskListProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  apiKey?: string;
  modelConfig?: AIModelConfig;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, setTasks, activeTaskId, setActiveTaskId, apiKey, modelConfig }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [error, setError] = useState('');

  const addTask = (title: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(),
      title,
      completed: false,
      pomodoros: 0,
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const clearAllTasks = () => {
    if (tasks.length === 0) return;
    if (activeTaskId) {
      // Keep only the active task
      setTasks(prev => prev.filter(t => t.id === activeTaskId));
    } else {
      // Clear all if no active task
      setTasks([]);
    }
  };

  const handleAiBreakdown = async () => {
    if (!aiPrompt.trim()) return;
    setError('');
    setIsGenerating(true);
    try {
      const suggestedTasks = await breakDownTask(aiPrompt, apiKey, modelConfig);
      if (suggestedTasks.length === 0) {
        setError('Failed to generate tasks. Please check your API Key in Settings or try again.');
      } else {
        const newTasks = suggestedTasks.map((title, idx) => ({
          id: Date.now().toString() + idx,
          title,
          completed: false,
          pomodoros: 0
        }));
        setTasks(prev => [...prev, ...newTasks]);
        setAiPrompt('');
        setShowAiInput(false);
      }
    } catch (e) {
      console.error("Failed to generate tasks", e);
      setError('An error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 text-white border border-white/10 h-full flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          Tasks
        </h3>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <button 
              onClick={clearAllTasks}
              className="text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-all font-bold tracking-wide border bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-white/80 hover:text-red-300"
              title={activeTaskId ? "Clear all except active task" : "Clear all tasks"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
          <button 
            onClick={() => setShowAiInput(!showAiInput)}
            className={`text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold tracking-wide border ${showAiInput ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            AI ASSIST
          </button>
        </div>
      </div>

      {showAiInput && (
        <div className="mb-8 p-5 bg-purple-900/30 rounded-2xl border border-purple-500/30 animate-fade-in shadow-inner">
          <label className="block text-xs font-bold text-purple-200 mb-3 uppercase tracking-wider">Break down a goal with AI</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Study for Biology Exam"
              className="flex-1 bg-black/40 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-purple-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleAiBreakdown()}
            />
            <button 
              onClick={handleAiBreakdown}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-500 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors shadow-lg"
            >
              {isGenerating ? '...' : 'Plan'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          {!apiKey && !process.env.API_KEY && (
             <p className="text-orange-300 text-xs mt-2 flex items-center gap-1">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               Tip: Add your Gemini API Key in Settings for better results.
             </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 custom-scrollbar">
        {tasks.length === 0 && !showAiInput && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-white/30 space-y-4 border-2 border-dashed border-white/5 rounded-2xl m-2">
             <div className="p-4 bg-white/5 rounded-full">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
             </div>
             <div>
               <p className="text-sm font-medium">Your task list is empty.</p>
               <p className="text-xs opacity-60 mt-1">Add a task below to get started.</p>
             </div>
          </div>
        )}
        {tasks.map(task => (
          <div 
            key={task.id} 
            className={`group flex items-center gap-4 p-5 rounded-2xl transition-all border cursor-pointer relative overflow-hidden ${activeTaskId === task.id ? 'bg-white/10 border-white/30 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}`}
            onClick={() => setActiveTaskId(task.id)}
          >
            {activeTaskId === task.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50"></div>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
              className={`flex-shrink-0 transition-all duration-300 ${task.completed ? 'text-emerald-400' : 'text-white/40 hover:text-emerald-400'}`}
            >
              {task.completed ? (
                 <div className="bg-emerald-400/20 p-1 rounded-full">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                 </div>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
              )}
            </button>
            
            <div className="flex-1 min-w-0 flex flex-col gap-1">
               <span className={`block text-sm font-medium truncate transition-all ${task.completed ? 'line-through text-white/40' : 'text-white'}`}>
                 {task.title}
               </span>
               {activeTaskId === task.id && !task.completed && (
                   <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse"></span>
                     Active
                   </span>
               )}
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
              className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-white/10 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="relative pt-4 border-t border-white/10">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskTitle)}
          placeholder="Add a new task..."
          className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-white/30 outline-none focus:bg-white/5 focus:border-white/30 transition-all shadow-inner"
        />
        <button 
          onClick={() => addTask(newTaskTitle)}
          disabled={!newTaskTitle.trim()}
          className="absolute right-3 top-7 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
  );
};

export default TaskList;