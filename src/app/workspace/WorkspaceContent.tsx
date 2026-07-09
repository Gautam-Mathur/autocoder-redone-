'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, LogMessage } from '@/context/AppContext';
import Editor from '@monaco-editor/react';
import {
  Play,
  Pause,
  RefreshCw,
  Folder,
  FileCode,
  Compass,
  Code,
  Eye,
  Activity,
  User,
  Settings,
  Database,
  ArrowRight,
  HelpCircle,
  Cpu,
  ChevronRight,
  Gavel,
  Terminal as TerminalIcon,
  CheckCircle
} from 'lucide-react';

export default function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt') || '';

  const { ollamaConnected, activeId, setActiveId, setActiveTitle, logs, addLog, clearLogs } = useApp();

  const [activeTab, setActiveTab] = useState<'flowchart' | 'code' | 'preview' | 'telemetry'>('flowchart');
  const [pipelineStatus, setPipelineStatus] = useState<string>('Idle');
  const [currentStage, setCurrentStage] = useState<string>('Queen');
  const [promptText, setPromptText] = useState(initialPrompt);

  // DB entities/blueprints loaded after compilation
  const [entities, setEntities] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [navigation, setNavigation] = useState<string[]>([]);
  const [componentsList, setComponentsList] = useState<any[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('// Select a file to view content');

  // Clarification state
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>(['', '', '']);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  // SSE Stream controller
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Sync conversation ID to global context
  useEffect(() => {
    if (conversationId) {
      setActiveId(conversationId);
      fetchConversationDetails(conversationId);
    }
  }, [conversationId]);

  // Auto-start pipeline if loaded with initial prompt and status is Idle
  useEffect(() => {
    if (detailsLoaded && pipelineStatus === 'Idle' && initialPrompt && ollamaConnected) {
      handleStartPipeline();
    }
  }, [detailsLoaded, pipelineStatus, initialPrompt, ollamaConnected]);

  // Handle scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load details from DB
  const fetchConversationDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPipelineStatus(data.status);
        setCurrentStage(data.currentStage);
        if (data.title) {
          setActiveTitle(data.title);
        }

        // Load SML data if exists
        loadSMLData(data.outputs);
      }

      // Also try to query files on disk
      const filesRes = await fetch(`/api/conversations/${id}/files`);
      if (filesRes.ok) {
        const diskFiles = await filesRes.json();
        if (diskFiles && diskFiles.length > 0) {
          setFiles(diskFiles);
        }
      }
      setDetailsLoaded(true);
    } catch (e) {
      console.error(e);
      setDetailsLoaded(true);
    }
  };

  const loadSMLData = (outputs: any[]) => {
    // Extrapolate outputs
    const plannerOut = outputs.find((o) => o.agentName === 'Planner');
    const archOut = outputs.find((o) => o.agentName === 'Architect');
    const sysOut = outputs.find((o) => o.agentName === 'System');
    const designerOut = outputs.find((o) => o.agentName === 'Designer');
    const coderOutputs = outputs.filter((o) => o.agentName === 'Coder');

    if (plannerOut) {
      const json = JSON.parse(plannerOut.validatedJson);
    }

    if (archOut) {
      const json = JSON.parse(archOut.validatedJson);
      setModules(json.modules || []);
      // Collate files list
      const filePaths: string[] = [];
      json.modules.forEach((mod: any) => {
        if (mod.pages) filePaths.push(...mod.pages);
        if (mod.components) filePaths.push(...mod.components);
        if (mod.services) filePaths.push(...mod.services);
        if (mod.apis) filePaths.push(...mod.apis);
      });
      setFiles([...new Set(filePaths)]);
    }

    if (sysOut) {
      const json = JSON.parse(sysOut.validatedJson);
      setEntities(json.entities || []);
    }

    if (designerOut) {
      const json = JSON.parse(designerOut.validatedJson);
      setNavigation(json.navigationMap || []);
      setComponentsList(json.components || []);
    }

    // Load file contents
    if (coderOutputs.length > 0) {
      // Find files dynamically
      coderOutputs.forEach((out) => {
        const json = JSON.parse(out.validatedJson);
        // Coder outputs contain code for files
      });
    }
  };

  // Start execution stream
  const handleStartPipeline = () => {
    if (!conversationId) return;
    if (!ollamaConnected) {
      alert('Please start Ollama locally before initiating pipeline.');
      return;
    }

    clearLogs();
    setPipelineStatus('Active');
    addLog({ type: 'SYSTEM', message: 'Initializing RuFlo specification compiler...' });

    // Establish SSE stream
    const url = `/api/pipeline/stream?conversationId=${conversationId}&prompt=${encodeURIComponent(promptText)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog({
        type: data.type,
        agent: data.agent,
        message: data.message,
        data: data.data,
      });

      if (data.agent) {
        setCurrentStage(data.agent);
      }

      if (data.type === 'PAUSE_APPROVAL_GATE') {
        setPipelineStatus('Paused');
        fetchConversationDetails(conversationId);
        eventSource.close();
      }

      if (data.type === 'PAUSE_CLARIFICATION') {
        setPipelineStatus('Paused');
        setNeedsClarification(true);
        setClarificationQuestions(data.data.questions || []);
        eventSource.close();
      }

      if (data.type === 'PIPELINE_SUCCESS' || data.type === 'PIPELINE_ERROR') {
        setPipelineStatus(data.type === 'PIPELINE_SUCCESS' ? 'Completed' : 'Failed');
        fetchConversationDetails(conversationId);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      addLog({ type: 'PIPELINE_ERROR', message: 'Connection to compiler service lost.' });
      setPipelineStatus('Failed');
      eventSource.close();
    };
  };

  // Listen to resume events from top bar
  useEffect(() => {
    const handleResume = () => {
      handleStartPipeline();
    };
    window.addEventListener('pipeline-resumed', handleResume);
    return () => window.removeEventListener('pipeline-resumed', handleResume);
  }, [conversationId, promptText]);

  // Handle Clarification Submit
  const handleClarificationSubmit = async () => {
    if (!conversationId) return;
    addLog({
      type: 'SYSTEM',
      message: 'Submitting clarification answers to Queen orchestrator...',
    });

    try {
      // Save answers as feedback or append to prompt
      const mergedAnswersPrompt = `${promptText}\n\nClarification Answers:\n` +
        clarificationQuestions.map((q, idx) => `Q: ${q}\nA: ${clarificationAnswers[idx]}`).join('\n');
      
      setPromptText(mergedAnswersPrompt);
      setNeedsClarification(false);

      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (res.ok) {
        // Restart SSE stream
        handleStartPipeline();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Select file in tree
  const handleSelectFile = async (filepath: string) => {
    setSelectedFile(filepath);
    setFileContent('// Loading file content...');

    try {
      // 1. Try reading from filesystem
      const diskRes = await fetch(`/api/conversations/${conversationId}/files/read?file=${encodeURIComponent(filepath)}`);
      if (diskRes.ok) {
        const fileData = await diskRes.json();
        if (fileData.content) {
          setFileContent(fileData.content);
          return;
        }
      }

      // 2. Fallback to DB outputs
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        const coderOutputs = data.outputs.filter((o: any) => o.agentName === 'Coder');
        
        let foundContent = '';
        coderOutputs.forEach((out: any) => {
          const json = JSON.parse(out.validatedJson);
          if (json.file === filepath || out.stage === filepath) {
            foundContent = json.code;
          }
        });

        if (foundContent) {
          setFileContent(foundContent);
        } else {
          // Fallback template mock file if coder hasn't completed yet
          setFileContent(`// Compiled artifact: ${filepath}\n// Status: Awaiting Coder compiler pass.\n\nexport function ${filepath.split('/').pop()?.split('.')[0]}() {\n  return (\n    <div className="p-4 bg-slate-900 border border-slate-700">\n      <h1>Autogenerated Module Content</h1>\n    </div>\n  );\n}`);
        }
      }
    } catch (e) {
      setFileContent('// Error loading file contents.');
    }
  };

  const getLanguage = (filepath: string) => {
    if (filepath.endsWith('.tsx') || filepath.endsWith('.jsx')) return 'typescript';
    if (filepath.endsWith('.ts') || filepath.endsWith('.js')) return 'typescript';
    if (filepath.endsWith('.css')) return 'css';
    if (filepath.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  return (
    <main className="flex-1 flex flex-col lg:flex-row bg-slate-950 overflow-hidden relative h-full">
      
      {/* Left Pane: Compiler Console & Controls (40%) */}
      <section className="w-full lg:w-[40%] flex flex-col border-r border-slate-700 bg-slate-900 overflow-hidden h-full">
        {/* Panel Header */}
        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-electric-indigo" />
            <span className="text-[10px] font-mono tracking-wider font-bold text-on-surface uppercase">Pipeline Interactions</span>
          </div>
          <span className={`px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono font-bold text-slate-300`}>
            Pass: {currentStage}
          </span>
        </div>

        {/* Console Log Feed */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="flex flex-col items-start gap-1">
            <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg rounded-tl-none max-w-[90%]">
              <span className="text-electric-indigo font-bold">System Orchestrator</span>
              <p className="text-slate-300 mt-1">Provide project details and hit run to compile the specifications.</p>
            </div>
          </div>

          {logs.map((log, idx) => {
            const isSystem = log.type === 'SYSTEM';
            const isComplete = log.type === 'AGENT_COMPLETE';
            const isError = log.type === 'AGENT_ERROR' || log.type === 'PIPELINE_ERROR';

            return (
              <div key={idx} className="flex flex-col items-start gap-1">
                <div className={`p-3 rounded-lg rounded-tl-none max-w-[95%] border ${
                  isError ? 'bg-red-950/20 border-red-500/30 text-red-300' :
                  isComplete ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' :
                  'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  <span className="text-electric-indigo font-bold">
                    {log.agent ? `${log.agent} Agent` : 'System'}
                  </span>
                  <div className="text-[11px] mt-1 whitespace-pre-line">{log.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* Input Trigger Block */}
        <div className="p-3 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={pipelineStatus === 'Active'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo focus:ring-0 placeholder-slate-500 outline-none resize-none h-16 disabled:opacity-50"
              placeholder="Send prompt or refine instructions..."
            />
            <button
              onClick={handleStartPipeline}
              disabled={pipelineStatus === 'Active' || !promptText.trim()}
              className="bg-electric-indigo text-white px-4 rounded flex flex-col justify-center items-center gap-1 hover:bg-indigo-500 transition-colors shadow-[0_0_8px_rgba(99,102,241,0.4)] disabled:opacity-50"
              title="Run Pipeline"
            >
              <Play className="w-4 h-4 fill-white" />
              <span className="text-[9px] font-bold">RUN</span>
            </button>
          </div>
        </div>
      </section>

      {/* Right Pane: Multi-Tab Workspace (60%) */}
      <section className="w-full lg:w-[60%] flex flex-col bg-slate-900 relative border-l border-slate-700 h-full">
        {/* Tabs Headers */}
        <div className="flex border-b border-slate-700 bg-slate-900 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'flowchart' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" /> Flowchart
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'code' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" /> Code Explorer
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'preview' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" /> Live Preview
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden relative bg-slate-950">
          
          {/* Flowchart Tab */}
          {activeTab === 'flowchart' && (
            <div className="w-full h-full overflow-y-auto p-6 flex flex-col gap-6 items-center justify-start">
              {modules.length === 0 ? (
                <div className="text-xs text-slate-500 py-12 flex flex-col items-center gap-2 justify-center h-full">
                  <Database className="w-12 h-12 text-slate-800" />
                  <span>Architecture flowchart will load here after the Architect stage compiles.</span>
                </div>
              ) : (
                <div className="w-full max-w-2xl flex flex-col gap-6">
                  {/* API Gateway Box */}
                  <div className="bg-slate-900 border border-electric-indigo/50 rounded-lg p-4 flex flex-col items-center justify-center relative shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                    <span className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-[9px] font-mono text-slate-400 absolute top-2 right-2">Port: 3000</span>
                    <TerminalIcon className="w-6 h-6 text-electric-indigo mb-1" />
                    <h4 className="text-sm font-bold text-on-surface">API Gateway &amp; App Routes</h4>
                    <p className="text-[10px] text-slate-400 text-center mt-1">Routes frontend pages and resolves APIs</p>
                  </div>

                  {/* Connectors */}
                  <div className="flex justify-around items-center">
                    <div className="w-[1px] h-6 bg-slate-700"></div>
                    <div className="w-[1px] h-6 bg-slate-700"></div>
                  </div>

                  {/* Modules grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {modules.map((mod) => (
                      <div key={mod.name} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-2 hover:border-slate-500 transition-colors">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                          <Cpu className="w-4 h-4 text-emerald-ship" />
                          <h5 className="text-xs font-bold text-on-surface">{mod.name}</h5>
                        </div>
                        <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                          {mod.pages && mod.pages.length > 0 && (
                            <div>Pages: <code className="text-slate-300">{mod.pages.join(', ')}</code></div>
                          )}
                          {mod.components && mod.components.length > 0 && (
                            <div>Components: <code className="text-slate-300">{mod.components.join(', ')}</code></div>
                          )}
                          {mod.services && mod.services.length > 0 && (
                            <div>Services: <code className="text-slate-300">{mod.services.join(', ')}</code></div>
                          )}
                          {mod.apis && mod.apis.length > 0 && (
                            <div>APIs: <code className="text-slate-300">{mod.apis.join(', ')}</code></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Entities list */}
                  {entities.length > 0 && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
                      <h5 className="text-xs font-bold text-on-surface border-b border-slate-800 pb-1.5 flex items-center gap-2">
                        <Database className="w-4 h-4 text-cyan-400" /> DB Entities Schema
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        {entities.map((entity) => (
                          <div key={entity.name} className="bg-slate-950 border border-slate-800 rounded p-2 text-[10px]">
                            <div className="font-bold text-slate-300 mb-1">{entity.name}</div>
                            <div className="flex flex-col text-slate-500 gap-0.5">
                              {entity.fields.map((f: any) => (
                                <div key={f.name}>{f.name}: {f.type}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Code Explorer Tab */}
          {activeTab === 'code' && (
            <div className="w-full h-full flex overflow-hidden">
              {/* File Tree Left sidebar */}
              <div className="w-48 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
                <div className="p-2 border-b border-slate-800 text-[10px] font-mono font-bold text-slate-400">FILE EXPLORER</div>
                {files.length === 0 ? (
                  <div className="p-4 text-[10px] text-slate-500">No files generated yet.</div>
                ) : (
                  <div className="py-2 flex flex-col gap-0.5">
                    {files.map((file) => (
                      <button
                        key={file}
                        onClick={() => handleSelectFile(file)}
                        className={`px-3 py-1.5 text-left text-[11px] font-mono flex items-center gap-2 hover:bg-slate-800 transition-colors ${
                          selectedFile === file ? 'bg-slate-800 text-electric-indigo' : 'text-slate-300'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{file.split('/').pop()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor Right container */}
              <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-950">
                {selectedFile && (
                  <div className="p-2 border-b border-slate-800 text-[11px] font-mono text-slate-500 bg-slate-950">
                    Active: {selectedFile}
                  </div>
                )}
                <div className="flex-1 w-full h-full overflow-hidden">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={selectedFile ? getLanguage(selectedFile) : 'typescript'}
                    value={fileContent}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono',
                      domReadOnly: true,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Tab */}
          {activeTab === 'preview' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              {pipelineStatus !== 'Completed' ? (
                <div className="text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Eye className="w-12 h-12 text-slate-800 animate-pulse" />
                  <span>Waiting for pipeline execution to complete code generation before rendering app preview.</span>
                </div>
              ) : (
                <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
                  {/* Frame Header Browser bar */}
                  <div className="bg-slate-950 border-b border-slate-800 p-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                    <div className="bg-slate-900 border border-slate-800 rounded px-4 py-0.5 text-[10px] w-64 truncate mx-auto">
                      http://localhost:8080/preview
                    </div>
                  </div>
                  <div className="flex-1 bg-white text-slate-900 flex flex-col items-center justify-center p-8">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                    <h5 className="font-bold text-lg">Application Successfully Compiled</h5>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Next.js router initialized. All {files.length} code assets generated in SML.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Telemetry live streams bottom dock */}
        <div className="border-t border-slate-700 bg-slate-950 h-32 flex flex-col flex-shrink-0">
          <div className="px-3 py-1.5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
            <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1.5 uppercase">
              <Activity className="w-3.5 h-3.5 text-electric-indigo" /> Live Telemetry
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${pipelineStatus === 'Active' ? 'bg-indigo-500 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{pipelineStatus}</span>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto font-mono text-[10px] text-slate-500 space-y-1 bg-slate-950/70">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={`${
                  log.type === 'PIPELINE_ERROR' ? 'text-red-400' :
                  log.type === 'AGENT_COMPLETE' ? 'text-emerald-400' :
                  'text-slate-400'
                }`}>
                  [{log.agent || 'SYSTEM'}]
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clarification Overlay Modal */}
        {needsClarification && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-warning/50 rounded-lg p-6 max-w-md w-full flex flex-col gap-4 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-slide-up">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-md text-on-surface">Queen Orchestrator Clarification</h4>
              </div>
              <p className="text-xs text-slate-300">
                To construct a stable implementation plan, please resolve the following architectural queries:
              </p>
              
              <div className="flex flex-col gap-3">
                {clarificationQuestions.map((q, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-400">{q}</label>
                    <input
                      type="text"
                      value={clarificationAnswers[idx]}
                      onChange={(e) => {
                        const next = [...clarificationAnswers];
                        next[idx] = e.target.value;
                        setClarificationAnswers(next);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-on-surface focus:border-amber-500 outline-none"
                      placeholder="Your response..."
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleClarificationSubmit}
                  className="bg-amber-warning text-slate-950 px-4 py-2 rounded text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  Submit Answers <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Gate Overlay Card */}
        {pipelineStatus === 'Paused' && currentStage === 'Architect' && (
          <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4 pointer-events-none">
            <div className="glass-panel w-full max-w-lg p-4 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col gap-3 pointer-events-auto animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-electric-indigo animate-bounce" />
                  <h4 className="font-bold text-on-surface text-sm">Architect Review Complete</h4>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded text-[9px] font-bold font-mono uppercase">Ready</span>
              </div>
              <p className="text-xs text-slate-300">
                The architecture plan has been compiled into the SML. Review the structural flowchart tab above. Do you approve proceeding to database design and source code generation?
              </p>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-1.5 border border-slate-600 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Reject &amp; Edit
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('pipeline-resumed'));
                  }}
                  className="px-3 py-1.5 bg-electric-indigo text-white rounded text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  Approve &amp; Generate
                </button>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
