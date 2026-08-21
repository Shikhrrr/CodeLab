import React, { useState } from 'react';
import {
  Zap,
  Users,
  Cpu,
  Code2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Loader2,
  X,
  AlertTriangle,
  Play,
  Workflow,
  Lock,
  Key,
  FolderPlus,
  CheckCircle2,
  Compass,
  ShieldCheck,
  DownloadCloud,
} from 'lucide-react';
import { createRoom, verifyRoom } from '../../services/api';
import LandingCanvas from './LandingCanvas';

// ─── Design Tokens & Props ─────────────────────────────────────────────────────
// Borders:       border-4 border-black
// Drop Shadows:  shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
// Active state:  translate-x-1 translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
// Palette:       Canary Yellow (#FFDE59), Pastel Pink (#FF90E8), Cyan (#70EEFF), Lime (#A6FF00), Off-white (#FFFDF0 / #FAFAFA)

interface LandingPageProps {
  onNavigateToRoom: (roomId: string, passcode?: string) => void;
}

// ─── Tech Stack Marquee Items (Fetched from Icon Provider CDNs) ────────────────
interface TechItem {
  name: string;
  category: string;
  color: string;
  iconUrl: string;
}

const TECH_STACK: TechItem[] = [
  {
    name: 'React 19',
    category: 'Frontend',
    color: '#70EEFF',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg',
  },
  {
    name: 'TypeScript',
    category: 'Language',
    color: '#FFDE59',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg',
  },
  {
    name: 'Tailwind CSS',
    category: 'Styling',
    color: '#A6FF00',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg',
  },
  {
    name: 'React Flow',
    category: 'Visual Graph',
    color: '#FF90E8',
    iconUrl: 'https://cdn.simpleicons.org/diagramsdotnet',
  },
  {
    name: 'Monaco Editor',
    category: 'IDE Engine',
    color: '#70EEFF',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg',
  },
  {
    name: 'Django 5',
    category: 'Backend API',
    color: '#A6FF00',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/django/django-plain.svg',
  },
  {
    name: 'Django Channels',
    category: 'WebSockets',
    color: '#FFDE59',
    iconUrl: 'https://cdn.simpleicons.org/socketdotio',
  },
  {
    name: 'Celery',
    category: 'Task Queue',
    color: '#FF90E8',
    iconUrl: 'https://cdn.simpleicons.org/celery',
  },
  {
    name: 'Redis',
    category: 'Cache & PubSub',
    color: '#70EEFF',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg',
  },
  {
    name: 'PostgreSQL',
    category: 'Database',
    color: '#A6FF00',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg',
  },
  {
    name: 'LangGraph',
    category: 'Agent Graph',
    color: '#FFDE59',
    iconUrl: 'https://cdn.simpleicons.org/langchain',
  },
  {
    name: 'Gemini API',
    category: 'LLM Engine',
    color: '#FF90E8',
    iconUrl: 'https://cdn.simpleicons.org/googlegemini',
  },
];

export default function LandingPage({ onNavigateToRoom }: LandingPageProps) {
  // Room Creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createWorkspaceName, setCreateWorkspaceName] = useState('New Architecture');
  const [createPasscode, setCreatePasscode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Room Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joinPasscodeInput, setJoinPasscodeInput] = useState('');
  const [isJoinProtected, setIsJoinProtected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);



  // ── 1. Create Room Action ──────────────────────────────────────────────────
  async function handleCreateRoom(name?: string, passcode?: string) {
    setIsCreating(true);
    setCreateError(null);
    try {
      const roomName = (name && name.trim()) || 'New Architecture';
      const cleanPasscode = (passcode && passcode.trim()) || undefined;
      const room = await createRoom(roomName, cleanPasscode);
      const targetId = room.room_id || room.id;
      if (targetId) {
        setIsCreateModalOpen(false);
        onNavigateToRoom(targetId, cleanPasscode);
      } else {
        throw new Error('No room ID returned from server');
      }
    } catch (err: unknown) {
      console.error('Failed to create room:', err);
      const msg = err instanceof Error ? err.message : 'Unable to create room. Please try again.';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateWorkspaceName('New Architecture');
    setCreatePasscode('');
    setCreateError(null);
    setIsCreateModalOpen(true);
  }

  function handleCreateModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleCreateRoom(createWorkspaceName, createPasscode);
  }

  function handleOpenJoinModal() {
    setRoomIdInput('');
    setJoinPasscodeInput('');
    setIsJoinProtected(false);
    setJoinError(null);
    setIsJoinModalOpen(true);
  }

  // ── 2. Join Room Action ────────────────────────────────────────────────────
  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = roomIdInput.trim();
    if (!code) {
      setJoinError('Please enter a room ID.');
      return;
    }

    setIsVerifying(true);
    setJoinError(null);

    try {
      const passcode = joinPasscodeInput.trim() || undefined;
      const res = await verifyRoom(code, passcode);
      if (res && res.exists) {
        if (res.is_locked) {
          setJoinError('This workspace is locked and cannot be joined.');
          return;
        }
        if (res.is_protected) {
          if (!passcode) {
            setIsJoinProtected(true);
            setJoinError('This workspace is passcode-protected. Please enter the room passcode below.');
            return;
          }
          if (res.access === false) {
            setIsJoinProtected(true);
            setJoinError('Incorrect room passcode. Please check and try again.');
            return;
          }
        }
        const targetId = res.room_id || res.id || code;
        setIsJoinModalOpen(false);
        onNavigateToRoom(targetId, passcode);
      } else {
        setJoinError('Workspace not found. Check code or create a new room.');
      }
    } catch (err: unknown) {
      console.error('Failed to verify room:', err);
      setJoinError('Workspace not found. Check code or create a new room.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFDF0] text-[#121212] font-mono selection:bg-[#FFDE59] selection:text-black overflow-x-hidden">
      {/* ─── Top System Ticker ─────────────────────────────────────────────────── */}
      <div className="bg-[#121212] text-[#FFDE59] border-b-4 border-black px-4 py-1.5 text-xs font-black uppercase tracking-widest flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#A6FF00] animate-pulse" />
          <span>⚡ CODELAB — AI ARCHITECTURE COMPILER FOR FULL-STACK ENGINEERS</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-[#FAFAFA]">
          <span>● WEBSOCKETS LIVE</span>
          <span>● DOCKER READY</span>
          <span>● LANGGRAPH POWERED</span>
        </div>
      </div>

      {/* ─── 1. Header / Navbar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FFFDF0]/95 backdrop-blur-md border-b-4 border-black px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_0_0_#121212]">
        {/* Bold Logo Badge with retro chip styling */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FFDE59] border-4 border-black px-3.5 py-1.5 shadow-[4px_4px_0px_0px_#121212] font-black text-lg sm:text-xl tracking-wider select-none">
            <Zap size={22} className="fill-[#121212] text-[#121212]" strokeWidth={2.5} />
            <span>CODELAB</span>
          </div>

          {/* Live system status pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#A6FF00] border-2 border-black px-2.5 py-1 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#121212]">
            <span className="w-2 h-2 rounded-full bg-[#121212] animate-ping" />
            <span>● LIVE</span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {/* GitHub Repository Link */}
          <a
            href="https://github.com/shikhrrr/codelab"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 text-xs font-black shadow-[3px_3px_0px_0px_#121212] hover:bg-[#70EEFF] transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GITHUB</span>
          </a>

          <button
            type="button"
            onClick={handleOpenJoinModal}
            className="bg-[#FF90E8] border-2 sm:border-4 border-black px-3.5 py-1.5 text-xs sm:text-sm font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#121212] transition-all cursor-pointer"
          >
            JOIN ROOM
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={isCreating}
            className="bg-[#A6FF00] border-2 sm:border-4 border-black px-3.5 py-1.5 text-xs sm:text-sm font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#121212] transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isCreating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span className="hidden sm:inline">CREATING...</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-black" />
                <span>NEW CANVAS</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ─── 2. Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-16 border-b-4 border-black bg-gradient-to-b from-[#FFFDF0] to-[#FAF9F5]">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#121212 1.5px, transparent 1.5px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 bg-[#70EEFF] border-3 border-black px-4 py-1.5 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_#121212] -rotate-1 hover:rotate-0 transition-transform">
            <Sparkles size={14} strokeWidth={2.5} />
            <span>VISUAL CANVAS → RUNNABLE REPOSITORY IN SECONDS</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[1.05] text-[#121212]">
            DRAW SYSTEM{' '}
            <span className="bg-[#FFDE59] px-2 py-0.5 border-4 border-black shadow-[6px_6px_0px_0px_#121212] inline-block -rotate-1">
              ARCHITECTURES
            </span>
            <br />
            GET FULL-STACK{' '}
            <span className="bg-[#FF90E8] px-2 py-0.5 border-4 border-black shadow-[6px_6px_0px_0px_#121212] inline-block rotate-1 mt-2">
              CODEBASES
            </span>
          </h1>

          {/* Subtext */}
          <p className="max-w-2xl mx-auto text-base sm:text-xl font-bold text-[#333] leading-relaxed">
            Draw system architectures on a shared canvas with your friends and turn them directly into full-stack codebases.
          </p>

          {/* Error Banner if room creation failed */}
          {createError && (
            <div className="max-w-lg mx-auto bg-[#FF6B6B] border-4 border-black p-3 shadow-[4px_4px_0px_0px_#121212] text-white font-bold text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={3} />
                <span>{createError}</span>
              </div>
              <button type="button" onClick={() => setCreateError(null)} className="underline text-xs">
                DISMISS
              </button>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4">
            {/* Action 1: Create Room */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={isCreating}
              className="w-full sm:w-auto bg-[#FFDE59] border-4 border-black px-8 py-4 text-lg sm:text-xl font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-75"
            >
              {isCreating ? (
                <>
                  <Loader2 size={22} className="animate-spin text-black" />
                  <span>CREATING WORKSPACE...</span>
                </>
              ) : (
                <>
                  <Zap size={22} className="fill-black" />
                  <span>CREATE ROOM</span>
                  <ArrowRight size={20} strokeWidth={3} />
                </>
              )}
            </button>

            {/* Action 2: Join Room */}
            <button
              type="button"
              onClick={handleOpenJoinModal}
              className="w-full sm:w-auto bg-[#FF90E8] border-4 border-black px-8 py-4 text-lg sm:text-xl font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users size={22} strokeWidth={2.5} />
              <span>JOIN ROOM</span>
            </button>
          </div>

          {/* Value props badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6 text-xs font-bold">
            <span className="bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#121212]">
              ✓ NO REGISTRATION REQUIRED
            </span>
            <span className="bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#121212]">
              ✓ ONE-CLICK ZIP EXPORT
            </span>
            <span className="bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#121212]">
              ✓ MULTIPLAYER WEBSOCKET SYNC
            </span>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES SECTION (Split 2-Column Layout with Edges) ─────────────── */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 border-b-4 border-black bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-block bg-[#A6FF00] border-3 border-black px-3 py-1 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#121212]">
              CORE ENGINE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              FROM WHITEBOARD SKETCH TO PRODUCTION CODE
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#555] max-w-xl mx-auto">
              Collaborative canvas frontend backed by asynchronous LangGraph pipeline workers to help you build your dream projects.
            </p>
          </div>

          {/* High-Contrast Bordered Container */}
          <div className="bg-[#FFFFFF] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column: 3 Neo-Brutalist Feature Cards */}
              <div className="lg:col-span-6 flex flex-col justify-between gap-6">
                {/* Feature Card 1 */}
                <div
                  className="bg-[#FFFDF0] border-4 border-black p-5 sm:p-6 shadow-[5px_5px_0px_0px_#121212] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] transition-all"
                  style={{ borderLeftColor: '#FF90E8', borderLeftWidth: '8px' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FF90E8] border-3 border-black p-3 shadow-[3px_3px_0px_0px_#121212] shrink-0">
                      <Workflow size={24} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-black text-[#FF90E8] px-2 py-0.5">
                          01
                        </span>
                        <h3 className="text-lg sm:text-xl font-black uppercase">
                          Real-Time Collaborative Canvas
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-[#444] leading-relaxed">
                        Multi-user architecture design with live cursor and state synchronization via Django Channels WebSockets. Instant node locking, port configuration, and drag-and-drop palettes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature Card 2 */}
                <div
                  className="bg-[#FFFDF0] border-4 border-black p-5 sm:p-6 shadow-[5px_5px_0px_0px_#121212] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] transition-all"
                  style={{ borderLeftColor: '#FFDE59', borderLeftWidth: '8px' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-[#FFDE59] border-3 border-black p-3 shadow-[3px_3px_0px_0px_#121212] shrink-0">
                      <Cpu size={24} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-black text-[#FFDE59] px-2 py-0.5">
                          02
                        </span>
                        <h3 className="text-lg sm:text-xl font-black uppercase">
                          Code Generation through LangGraph Agents
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-[#444] leading-relaxed">
                        Asynchronous background graph parsing that compiles connected topology into structured production boilerplates with FastAPI/Django, PostgreSQL migrations, and unified Docker Compose.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature Card 3 */}
                <div
                  className="bg-[#FFFDF0] border-4 border-black p-5 sm:p-6 shadow-[5px_5px_0px_0px_#121212] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] transition-all"
                  style={{ borderLeftColor: '#70EEFF', borderLeftWidth: '8px' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-[#70EEFF] border-3 border-black p-3 shadow-[3px_3px_0px_0px_#121212] shrink-0">
                      <Code2 size={24} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-black text-[#70EEFF] px-2 py-0.5">
                          03
                        </span>
                        <h3 className="text-lg sm:text-xl font-black uppercase">
                          Monaco IDE & Contextual AI
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-[#444] leading-relaxed">
                        Built-in code tree explorer, source viewer, in-place editor, and an AI chat assistant to modify generated files. One-click instant ZIP download of the complete codebase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Diagram with SVG Connected Edges */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="h-full bg-[#FFFFFF] border-4 border-black shadow-[6px_6px_0px_0px_#121212] flex flex-col overflow-hidden">
                  {/* Visual Window Header */}
                  <div className="bg-[#121212] px-4 py-2.5 border-b-4 border-black flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#FF90E8] border border-black" />
                      <span className="w-3 h-3 rounded-full bg-[#70EEFF] border border-black" />
                      <span className="w-3 h-3 rounded-full bg-[#A6FF00] border border-black" />
                      <span className="ml-2 text-xs font-black text-[#FFDE59] uppercase tracking-wider">
                        CONNECTED TOPOLOGY GRAPH
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-[#A6FF00] bg-[#121212] border border-[#A6FF00] px-2 py-0.5">
                      ● LIVE EDGES
                    </span>
                  </div>

                  {/* Wire Diagram Canvas with Connected Nodes and Rendered Edges */}
                  <div className="flex-1 relative min-h-[440px] overflow-hidden">
                    <LandingCanvas />
                  </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. "TECH USED TO BUILD THIS" (Infinite Smooth Marquee to the Right) ─ */}
      <section className="py-16 border-b-4 border-black bg-[#FFFDF0] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[#FFDE59] border-3 border-black px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212]">
              STACK
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              TECH USED TO BUILD THIS
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <Compass size={14} />
            <span>SMOOTH SCROLL RIGHT · HOVER TO PAUSE</span>
          </div>
        </div>

        {/* Marquee Track (Smooth Continuous Right Scroll) */}
        <div className="w-full overflow-hidden py-4 bg-[#FAF9F5] border-y-4 border-black">
          <div className="animate-marquee-right flex gap-5 whitespace-nowrap">
            {/* Duplicated items to guarantee seamless infinite loop */}
            {[...TECH_STACK, ...TECH_STACK].map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-4 py-2 flex items-center gap-2 font-mono font-bold text-sm hover:-translate-y-1 transition-transform cursor-default select-none shrink-0"
              >
                <div
                  className="p-1 border border-black shrink-0 flex items-center justify-center bg-white"
                  style={{ backgroundColor: item.color }}
                >
                  <img
                    src={item.iconUrl}
                    alt={item.name}
                    className="w-4 h-4 object-contain shrink-0"
                    loading="lazy"
                  />
                </div>
                <span className="font-black text-[#121212]">{item.name}</span>
                <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 border border-black uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. CREATOR / PORTFOLIO SECTION ("THIS WEBSITE WAS BUILT BY") ──────── */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 border-b-4 border-black bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Standalone Brutalist Header Label */}
          <div className="text-center space-y-3">
            <div className="inline-block bg-[#FF90E8] border-3 border-black px-4 py-1 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#121212]">
              AUTHOR
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              BUILT WITH LOVE, BY SHIKHAR
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#555] max-w-xl mx-auto">
              CHECK OUT MY PORTFOLIO
            </p>
          </div>

          {/* Embedded Retro Desktop Browser Window */}
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-6xl mx-auto mb-16 overflow-hidden">
            {/* Top Control Bar */}
            <div className="bg-[#121212] px-4 py-3 border-b-4 border-black flex flex-wrap items-center justify-between gap-3">
              {/* Colored Action Dots: Pink (#FF90E8), Cyan (#70EEFF), Lime (#A6FF00) */}
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF90E8] border border-black" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#70EEFF] border border-black" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#A6FF00] border border-black" />
              </div>

              {/* Monospace URL Pill */}
              <div className="flex-1 max-w-xl bg-[#FAF9F5] border-2 border-black px-3.5 py-1.5 text-xs font-mono text-[#121212] truncate flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
                <span className="text-[#888]">https://</span>
                <span className="font-black text-[#121212]">shikhrrr.pythonanywhere.com</span>
              </div>

              {/* External Open Tab Button */}
              <a
                href="https://shikhrrr.pythonanywhere.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#A6FF00] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#FFF] hover:bg-[#FFDE59] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 transition-colors"
              >
                <span>OPEN IN NEW TAB</span>
                <ExternalLink size={13} strokeWidth={3} />
              </a>
            </div>

            {/* Embedded Iframe */}
            <div className="w-full bg-white relative">
              <iframe
                src="https://shikhrrr.pythonanywhere.com"
                title="Shikhar Portfolio"
                className="w-full h-[650px] border-0 rounded-b-lg bg-white"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. "START BUILDING" CALL TO ACTION SECTION ────────────────────────── */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 border-b-4 border-black bg-[#FFDE59] relative overflow-hidden">
        {/* Background Dot Texture */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#121212 2px, transparent 2px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-white border-3 border-black px-4 py-1 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#121212]">
            <Zap size={14} className="fill-black" />
            <span>START BUILDING TODAY</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#121212] leading-tight">
            STOP WRITING HEAVY PROMPTS.
            <br />
            <span className="bg-[#FF90E8] px-3 py-1 border-4 border-black shadow-[6px_6px_0px_0px_#121212] inline-block -rotate-1 mt-2">
              START DRAWING ARCHITECURES INSTEAD.
            </span>
          </h2>

          <p className="max-w-2xl mx-auto text-base sm:text-lg font-bold text-[#121212]">
            Create a shared canvas in seconds, invite your team with zero login hurdles, and compile directly into runnable full-stack projects.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={isCreating}
              className="w-full sm:w-auto bg-[#121212] text-white border-4 border-black px-8 py-4 text-base sm:text-lg font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_#FFF] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#FFF] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-75"
            >
              {isCreating ? (
                <>
                  <Loader2 size={20} className="animate-spin text-[#FFDE59]" />
                  <span>CREATING STUDIO...</span>
                </>
              ) : (
                <>
                  <FolderPlus size={20} strokeWidth={2.5} />
                  <span>CREATE NEW ROOM</span>
                  <ArrowRight size={18} strokeWidth={3} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenJoinModal}
              className="w-full sm:w-auto bg-[#70EEFF] text-black border-4 border-black px-8 py-4 text-base sm:text-lg font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_#121212] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users size={20} strokeWidth={2.5} />
              <span>JOIN WITH ROOM ID</span>
            </button>
          </div>

          {/* Feature Checklist Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 max-w-4xl mx-auto text-xs font-black">
            <div className="bg-white border-2 border-black p-2.5 shadow-[3px_3px_0px_0px_#121212] flex items-center justify-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#092E20] shrink-0" />
              <span>100% FREE</span>
            </div>
            <div className="bg-white border-2 border-black p-2.5 shadow-[3px_3px_0px_0px_#121212] flex items-center justify-center gap-1.5">
              <DownloadCloud size={15} className="text-[#3178C6] shrink-0" />
              <span>INSTANT ZIP EXPORT</span>
            </div>
            <div className="bg-white border-2 border-black p-2.5 shadow-[3px_3px_0px_0px_#121212] flex items-center justify-center gap-1.5">
              <ShieldCheck size={15} className="text-[#9333EA] shrink-0" />
              <span>SECURE ROOMS FOR TEAMS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#121212] text-white border-t-4 border-black px-4 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Logo & Brand Info */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#FFDE59] text-[#121212] border-3 border-black px-3 py-1 font-black text-lg shadow-[3px_3px_0px_0px_#FFF]">
              <Zap size={18} className="fill-[#121212]" />
              <span>CODELAB</span>
            </div>
            <p className="text-xs text-[#AAA] font-medium max-w-sm">
              Draw system architectures on a shared canvas and turn them directly into full-stack codebases.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-[#A6FF00] text-black border-2 border-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#FFF] hover:bg-[#FFDE59] transition-colors cursor-pointer"
            >
              CREATE NEW ROOM
            </button>
            <button
              type="button"
              onClick={handleOpenJoinModal}
              className="bg-[#FF90E8] text-black border-2 border-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#FFF] hover:bg-[#70EEFF] transition-colors cursor-pointer"
            >
              ENTER ROOM ID
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[#333] flex flex-col sm:flex-row items-center justify-between text-xs text-[#888] gap-3">
          <span>© {new Date().getFullYear()} CODELAB. NEO-BRUTALIST ARCHITECTURE COMPILER.</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/shikhrrr/codelab"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FFDE59]"
            >
              GITHUB
            </a>
            <a
              href="https://shikhrrr.pythonanywhere.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FFDE59]"
            >
              AUTHOR
            </a>
          </div>
        </div>
      </footer>

      {/* ─── 8. Neo-Brutalist Create Room Modal Dialog ─────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-[#FFFDF0] border-4 border-black shadow-[10px_10px_0px_0px_#121212] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-[#FFDE59] border-b-4 border-black px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus size={18} strokeWidth={3} />
                <span className="font-black text-sm uppercase tracking-wider">CREATE WORKSPACE</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-white border-2 border-black p-1 hover:bg-[#FF90E8] transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateModalSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[#121212]">
                  WORKSPACE NAME:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Distributed Auth Service"
                  value={createWorkspaceName}
                  onChange={(e) => {
                    setCreateWorkspaceName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  className="w-full bg-[#FFFFFF] border-3 border-black p-3.5 font-mono text-base font-bold text-[#121212] outline-none shadow-[4px_4px_0px_0px_#121212] focus:border-black focus:bg-[#FFFDE0] placeholder:text-[#999]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>OPTIONAL PASSCODE:</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave empty for public access"
                  value={createPasscode}
                  onChange={(e) => setCreatePasscode(e.target.value)}
                  className="w-full bg-[#FFFFFF] border-3 border-black p-3.5 font-mono text-base font-bold text-[#121212] outline-none shadow-[4px_4px_0px_0px_#121212] focus:border-black focus:bg-[#FFFDE0] placeholder:text-[#999]"
                />
                <p className="text-[11px] font-semibold text-[#666]">
                  Protect your architecture diagrams and generated code with a room passcode.
                </p>
              </div>

              {/* Error Message */}
              {createError && (
                <div className="bg-[#FF6B6B] border-3 border-black p-3 text-white font-bold text-xs shadow-[3px_3px_0px_0px_#121212] flex items-start gap-2">
                  <AlertTriangle size={16} strokeWidth={3} className="shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-white border-3 border-black px-4 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:bg-[#FAF9F5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !createWorkspaceName.trim()}
                  className="bg-[#A6FF00] border-3 border-black px-6 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>CREATING...</span>
                    </>
                  ) : (
                    <>
                      <span>LAUNCH CANVAS</span>
                      <ArrowRight size={14} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 9. Neo-Brutalist Join Room Modal Dialog ──────────────────────────── */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-[#FFFDF0] border-4 border-black shadow-[10px_10px_0px_0px_#121212] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-[#FF90E8] border-b-4 border-black px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} strokeWidth={3} />
                <span className="font-black text-sm uppercase tracking-wider">JOIN WORKSPACE</span>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="bg-white border-2 border-black p-1 hover:bg-[#FFDE59] transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleJoinSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[#121212]">
                  ROOM ID:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="E.G. 8D7A12BC"
                  value={roomIdInput}
                  onChange={(e) => {
                    setRoomIdInput(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                  className="w-full bg-[#FFFFFF] border-3 border-black p-3.5 font-mono text-base font-black tracking-wider text-[#121212] outline-none shadow-[4px_4px_0px_0px_#121212] focus:border-black focus:bg-[#FFFDE0] uppercase placeholder:normal-case placeholder:font-bold placeholder:text-[#999]"
                />
                <p className="text-[11px] font-semibold text-[#666]">
                  Enter the 8-character Room ID shared by your collaborator.
                </p>
              </div>

              {/* Passcode input field */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-black uppercase tracking-wider text-[#121212] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key size={14} />
                    <span>ROOM PASSCODE:</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#888]">
                    {isJoinProtected ? '(REQUIRED)' : '(OPTIONAL)'}
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="Enter passcode if workspace is protected"
                  value={joinPasscodeInput}
                  onChange={(e) => {
                    setJoinPasscodeInput(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                  className={`w-full bg-[#FFFFFF] border-3 border-black p-3.5 font-mono text-sm font-bold text-[#121212] outline-none shadow-[4px_4px_0px_0px_#121212] focus:border-black focus:bg-[#FFFDE0] ${
                    isJoinProtected ? 'border-[#FF6B6B] bg-[#FFF5F5]' : ''
                  }`}
                />
              </div>

              {/* Error Message */}
              {joinError && (
                <div className="bg-[#FF6B6B] border-3 border-black p-3 text-white font-bold text-xs shadow-[3px_3px_0px_0px_#121212] flex items-start gap-2">
                  <AlertTriangle size={16} strokeWidth={3} className="shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="bg-white border-3 border-black px-4 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:bg-[#FAF9F5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !roomIdInput.trim()}
                  className="bg-[#A6FF00] border-3 border-black px-6 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>CHECKING...</span>
                    </>
                  ) : (
                    <>
                      <span>CONNECT</span>
                      <ArrowRight size={14} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
