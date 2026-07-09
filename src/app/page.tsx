'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Store,
  Kanban,
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  FolderOpen,
  Paperclip,
  Database,
} from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  status: string;
  currentStage: string;
  updatedAt: string;
}

export default function LandingDashboard() {
  const router = useRouter();
  const { ollamaConnected, ollamaModels, activeModel, setActiveModel, setActiveId, setActivePrompt } = useApp();
  const [promptText, setPromptText] = useState('');
  const [pipelines, setPipelines] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent pipelines
  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleInitialize = async (title: string, customPromptText?: string) => {
    if (!ollamaConnected) {
      alert('Please connect and run Ollama on localhost:11434 before starting the pipeline.');
      return;
    }

    const finalPrompt = customPromptText || promptText;
    if (!finalPrompt.trim()) return;

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveId(data.id);
        setActivePrompt(finalPrompt);
        router.push(`/workspace?id=${data.id}&prompt=${encodeURIComponent(finalPrompt)}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const blueprints = [
    {
      title: 'E-Commerce Core',
      desc: 'Next.js storefront, Stripe checkout, payload CMS, Postgres.',
      prompt: 'A full-stack e-commerce storefront utilizing Next.js, Stripe checkouts, SQLite database with Prisma, and a catalog search page.',
      icon: Store,
      colorClass: 'text-indigo-400',
    },
    {
      title: 'Kanban Workspace',
      desc: 'React DnD, Socket.io real-time updates, Redis caching.',
      prompt: 'A Kanban board project management app with cards, drag and drop columns, task labels, and server side state persistence.',
      icon: Kanban,
      colorClass: 'text-emerald-400',
    },
    {
      title: 'Fitness Tracker',
      desc: 'Mobile-first PWA, Chart.js analytics, SQLite local-first.',
      prompt: 'A fitness logging application supporting workout records, custom exercise lists, history log table, and analytical charts.',
      icon: Flame,
      colorClass: 'text-cyan-400',
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col gap-6">
      {/* Alert if Ollama is disconnected */}
      {!ollamaConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <div>
            <div className="font-bold">Ollama Connection Warning</div>
            <div className="text-xs">
              Local Ollama endpoint (<code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">http://localhost:11434</code>) is currently offline. Please start Ollama locally and pull the target model (e.g. <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">llama3:8b-instruct</code>) to execute real prompt compilation.
            </div>
          </div>
        </div>
      )}

      {/* Start New Project Section */}
      <section className="bg-slate-900 border border-slate-700 rounded-lg p-6 relative overflow-hidden flex flex-col gap-4 flex-shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-electric-indigo/10 blur-[100px] pointer-events-none"></div>
        <h2 className="text-xl font-bold text-on-surface z-10">Start New Project</h2>

        <div className="relative z-10 flex flex-col bg-slate-950 border border-slate-700 rounded focus-within:border-electric-indigo focus-within:ring-1 focus-within:ring-electric-indigo/50 transition-all p-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={!ollamaConnected}
            style={{ height: '96px', minHeight: '96px' }}
            className="bg-transparent border-none text-on-surface text-sm placeholder-slate-400 focus:ring-0 resize-none p-2 outline-none disabled:opacity-50 w-full"
            placeholder={
              ollamaConnected
                ? "Describe the application you want to build. E.g., 'A full-stack CRM dashboard with React, Tailwind, and Supabase...'"
                : "Initialize Ollama connection to start prompting..."
            }
          />
          <div className="flex justify-between items-center p-2 border-t border-slate-800/50 mt-2" style={{ minHeight: '48px' }}>
            <div className="flex items-center gap-3">
              <button type="button" className="text-slate-400 hover:text-on-surface transition-colors" title="Attach Architecture Diagram">
                <Paperclip className="w-5 h-5" />
              </button>
              <button type="button" className="text-slate-400 hover:text-on-surface transition-colors" title="Connect Database Schema">
                <Database className="w-5 h-5" />
              </button>
              {ollamaConnected && ollamaModels.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-355 ml-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Model:</span>
                  <select
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-slate-300">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-slate-500 text-xs ml-2">Describe project above.</span>
              )}
            </div>
            <button
              onClick={() => {
                if (!promptText.trim()) return;
                const nameInput = window.prompt('Enter a unique name for your project:', 'My App');
                if (nameInput === null) return; // user cancelled
                const trimmedName = nameInput.trim();
                if (!trimmedName) {
                  alert('Project name is mandatory to initialize the compilation pipeline!');
                  return;
                }
                const titleWithTimestamp = `${trimmedName} - ${new Date().toISOString()}`;
                handleInitialize(titleWithTimestamp);
              }}
              disabled={!ollamaConnected || !promptText.trim()}
              className="bg-electric-indigo text-white px-6 py-2 rounded text-xs font-bold hover:bg-indigo-500 transition-colors shadow-[0_0_12px_rgba(129,140,248,0.5)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Initialize Pipeline <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick-Start Blueprints */}
        <div className="mt-4 z-10">
          <h3 className="text-[10px] font-bold tracking-wider text-slate-400 mb-3 uppercase">QUICK-START BLUEPRINTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {blueprints.map((bp) => {
              const Icon = bp.icon;
              return (
                <div
                  key={bp.title}
                  onClick={() => {
                    if (ollamaConnected) {
                      setPromptText(bp.prompt);
                      const nameInput = window.prompt(`Enter a name for your ${bp.title} project:`, bp.title);
                      if (nameInput === null) return; // user cancelled
                      const trimmedName = nameInput.trim();
                      if (!trimmedName) {
                        alert('Project name is mandatory!');
                        return;
                      }
                      const titleWithTimestamp = `${trimmedName} - ${new Date().toISOString()}`;
                      handleInitialize(titleWithTimestamp, bp.prompt);
                    }
                  }}
                  className={`bg-slate-900 border border-slate-700 hover:border-electric-indigo/50 p-4 rounded cursor-pointer group transition-all relative overflow-hidden ${
                    !ollamaConnected && 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-electric-indigo/5 blur-[30px] group-hover:bg-electric-indigo/10 transition-all pointer-events-none"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${bp.colorClass}`} />
                    <h4 className="text-sm font-bold text-on-surface">{bp.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{bp.desc}</p>
                  <div className="flex gap-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-bold rounded">Next.js</span>
                    <span className="px-2 py-0.5 bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-bold rounded">Prisma</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Pipelines Grid */}
      <section className="flex flex-col gap-4 flex-shrink-0">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <h3 className="text-md font-bold text-on-surface">Active Pipelines &amp; History</h3>
          <span className="text-xs text-slate-400">Total: {pipelines.length}</span>
        </div>

        {loading ? (
          <div className="text-xs text-slate-400 py-4">Loading active sessions...</div>
        ) : pipelines.length === 0 ? (
          <div className="text-xs text-slate-500 py-8 border border-dashed border-slate-800 rounded flex flex-col items-center justify-center gap-2">
            <FolderOpen className="w-8 h-8 text-slate-700" />
            <span>No active compilation sessions. Describe a project above to start.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pipelines.map((pipe) => {
              const isActive = pipe.status === 'Active';
              const isPaused = pipe.status === 'Paused';
              const isCompleted = pipe.status === 'Completed';

              return (
                <div
                  key={pipe.id}
                  onClick={() => {
                    setActiveId(pipe.id);
                    router.push(`/workspace?id=${pipe.id}`);
                  }}
                  className={`bg-slate-900 border border-slate-700 p-4 rounded flex flex-col gap-3 relative cursor-pointer hover:border-slate-500 transition-colors`}
                >
                  {/* Left accent strip */}
                  <div className={`absolute top-0 left-0 w-1 h-full rounded-l ${
                    isActive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' :
                    isPaused ? 'bg-amber-500 animate-pulse' :
                    'bg-emerald-500'
                  }`} />

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h4 className="text-sm font-bold text-on-surface mb-1">{pipe.title}</h4>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Last updated {new Date(pipe.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded flex items-center gap-1 ${
                      isActive ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                      isPaused ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {isActive && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />}
                      {isPaused && <HelpCircle className="w-3 h-3" />}
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      {pipe.currentStage} ({pipe.status})
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-400">
                    <div>ID: <span className="text-slate-500">{pipe.id}</span></div>
                    {isPaused && (
                      <div className="text-amber-400 mt-1">
                        &gt; Halted at Approval Gate. Action required in Workspace.
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-emerald-400 mt-1">
                        &gt; Compilation successful. Code ready for review.
                      </div>
                    )}
                    {isActive && (
                      <div className="text-indigo-400 mt-1 animate-pulse">
                        &gt; Active compiler passes. Click to view log feeds.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
