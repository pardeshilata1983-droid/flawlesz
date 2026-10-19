import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../services/api.ts';
import { BotAvatar, BotStatus } from '../components/BotAvatar.tsx';
import {
  Sparkles,
  Users,
  Settings,
  ArrowRight,
  Loader2,
  Bookmark,
  History,
  Send,
  Lock,
  Cpu,
  RefreshCw,
  Check,
  Pencil,
  X,
  MessageSquare,
  Activity as ActivityIcon,
  Trash2,
  Hammer,
  Plus,
  Volume2,
  VolumeX,
  Play,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OfficeBackdrop } from '../components/OfficeBackdrop.tsx';
import { MeetingRoom } from '../components/MeetingRoom.tsx';
import { meetingVoice } from '../services/meetingVoice.ts';
import { TEAMMATE_PRESETS } from '../config/teammates.ts';
import { GlowingEffect } from '../components/ui/glowing-effect.tsx';

interface TeammatesOfficePageProps {
  onNavigate: (path: string, initialIdea?: string) => void;
  initialIdea?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  provider: string;
  useManaged?: boolean;
}

const SUGGESTED_NAMES = [
  'Atlas',
  'Elena',
  'Nova',
  'Iris',
  'Marcus',
  'Sage',
  'Orion',
  'Aria',
  'Dexter',
  'Vesper',
  'Pixel'
];

const STARTUP_TEMPLATES: TeamMember[] = TEAMMATE_PRESETS.slice(0, 4).map(t => ({
  id: `tm-startup-${t.id}`,
  name: t.name,
  role: t.role,
  provider: t.provider
}));

const GENERAL_TEMPLATES: TeamMember[] = [
  TEAMMATE_PRESETS[0],
  TEAMMATE_PRESETS[1],
  TEAMMATE_PRESETS[2],
  TEAMMATE_PRESETS[4]
].map(t => ({
  id: `tm-gen-${t.id}`,
  name: t.name,
  role: t.role,
  provider: t.provider
}));

export const TeammatesOfficePage: React.FC<TeammatesOfficePageProps> = ({ onNavigate, initialIdea }) => {
  const { user } = useAuth();
  const isOwner = Boolean(user?.isOwner) || Boolean(
    user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user?.role === 'admin' || user?.plan === 'enterprise';

  const plan = isOwner ? 'enterprise' : (user?.plan || 'free');
  const isFree = !isOwner && plan === 'free';

  const [mode, setMode] = useState<'startup' | 'general' | null>('general');
  const [activeTab, setActiveTab] = useState<'chat' | 'activity'>('chat');
  const [chatSubMode, setChatSubMode] = useState<'chat' | 'meeting'>('chat');
  const [meetingTopic, setMeetingTopic] = useState('');
  const [selectedMeetingTeamIds, setSelectedMeetingTeamIds] = useState<string[]>([]);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [viewingHistoryMeeting, setViewingHistoryMeeting] = useState<any | null>(null);
  const [isReplayingVoice, setIsReplayingVoice] = useState(false);

  // Office visual synchronization from Meeting
  const [meetingOfficeVisuals, setMeetingOfficeVisuals] = useState<{
    speakingRole: string | null;
    speakingTextSnippet: string | null;
    pendingRole: string | null;
    errorRoles: Record<string, string>;
  }>({
    speakingRole: null,
    speakingTextSnippet: null,
    pendingRole: null,
    errorRoles: {}
  });

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [managedProviders, setManagedProviders] = useState<Record<string, boolean>>({
    groq: true,
    openai: false,
    perplexity: false,
    xai: false,
    openrouter: false
  });
  const [presets, setPresets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [trialUsed, setTrialUsed] = useState<boolean>(false);

  // Active team assembly
  const [team, setTeam] = useState<TeamMember[]>(GENERAL_TEMPLATES.slice(0, 5));
  const [taskInput, setTaskInput] = useState('');
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, BotStatus>>({});
  const [outputs, setOutputs] = useState<Record<string, { text?: string; error?: string }>>({});
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [activityTimeline, setActivityTimeline] = useState<Array<{ timestamp: string; teammate: string; text: string }>>([]);

  // Custom employee name editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  // Custom role input
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleProvider, setNewRoleProvider] = useState('gemini');

  // Drawers / Modals
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (initialIdea) {
      try {
        if (initialIdea.trim().startsWith('{')) {
          const parsed = JSON.parse(initialIdea);
          if (parsed.mode === 'meeting') {
            setChatSubMode('meeting');
            if (parsed.topic) setMeetingTopic(parsed.topic);
          } else if (parsed.idea) {
            setTaskInput(parsed.idea);
            setMeetingTopic(parsed.idea);
          }
        } else {
          setTaskInput(initialIdea);
          setMeetingTopic(initialIdea);
        }
      } catch {
        setTaskInput(initialIdea);
        setMeetingTopic(initialIdea);
      }
    }
  }, [initialIdea]);

  useEffect(() => {
    if (team.length > 0 && selectedMeetingTeamIds.length === 0) {
      setSelectedMeetingTeamIds(team.slice(0, 5).map(m => m.id));
    }
  }, [team, selectedMeetingTeamIds.length]);

  const handleToggleMeetingMember = (memberId: string) => {
    setSelectedMeetingTeamIds(prev => {
      if (prev.includes(memberId)) {
        if (prev.length <= 2) return prev; // minimum 2
        return prev.filter(id => id !== memberId);
      } else {
        if (prev.length >= 5) return prev; // maximum 5
        return [...prev, memberId];
      }
    });
  };

  const handleStartMeeting = () => {
    if (!meetingTopic.trim()) return;
    if (selectedMeetingTeamIds.length < 2 || selectedMeetingTeamIds.length > 5) return;
    meetingVoice.unlockAudio();
    setIsMeetingRunning(true);
  };

  const normalizeLoadedTeam = (loadedTeam: any[]): TeamMember[] => {
    return (loadedTeam || []).slice(0, 5).map((m, idx) => ({
      id: m.id || `member-${idx}-${Date.now()}`,
      name: m.name || SUGGESTED_NAMES[idx % SUGGESTED_NAMES.length] || `Agent ${idx + 1}`,
      role: m.role || 'Specialist',
      provider: m.provider || 'openai',
      useManaged: m.useManaged
    }));
  };

  const fetchStatus = async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || {});
        if (data.managedProviders) {
          setManagedProviders(data.managedProviders);
        }
        setPresets(data.presets || []);
        setHistory(data.history || []);
        if (data.teammates_trial_used !== undefined) {
          setTrialUsed(Boolean(data.teammates_trial_used));
        }
      }
    } catch (err) {
      console.error('Failed to fetch teammates status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const effectiveTrialUsed = false;
  const isLocked = false;

  const handleSelectMode = (selectedMode: 'startup' | 'general') => {
    setMode(selectedMode);
    if (selectedMode === 'startup') {
      setTeam(STARTUP_TEMPLATES.slice(0, 5));
    } else {
      setTeam(GENERAL_TEMPLATES.slice(0, 5));
    }
  };

  const handleAddTeamMember = (newMember: TeamMember) => {
    setTeam(prev => {
      if (prev.length >= 9) return prev;
      return [...prev, newMember];
    });
  };

  const handleAddCustomRole = () => {
    if (!newRoleName.trim() || team.length >= 9) return;
    const assignedName = newEmployeeName.trim() || SUGGESTED_NAMES[(team.length + 3) % SUGGESTED_NAMES.length];
    setTeam(prev => {
      if (prev.length >= 9) return prev;
      return [
        ...prev,
        {
          id: `custom-${Date.now()}-${prev.length}`,
          name: assignedName,
          role: newRoleName.trim(),
          provider: newRoleProvider
        }
      ];
    });
    setNewRoleName('');
    setNewEmployeeName('');
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeam(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingNameValue('');
    }
  };

  const startEditingName = (idx: number) => {
    setEditingIndex(idx);
    setEditingNameValue(team[idx].name || '');
  };

  const handleSaveEmployeeName = (idx: number) => {
    const trimmed = editingNameValue.trim();
    if (trimmed) {
      setTeam(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], name: trimmed };
        return next;
      });
    }
    setEditingIndex(null);
    setEditingNameValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingNameValue('');
  };

  const handleRunTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskInput.trim() || team.length === 0 || running) return;

    // Validate that all active teammates have real API keys (BYOK or Flawlesz-Managed)
    const unconfigured = team.filter((m) => !keys[m.provider] && !managedProviders[m.provider]);
    if (unconfigured.length > 0) {
      const missingList = unconfigured.map((m) => `${m.name} (${m.role} • ${m.provider})`).join(', ');
      setSynthesis(
        `Cannot execute task: API key not configured for ${missingList}. Please configure BYOK keys in Settings or switch them to Google Gemini.`
      );
      return;
    }

    setRunning(true);
    setSynthesis(null);
    setOutputs({});
    setActivityTimeline([]);

    // Start with thinking / Researching status
    const initialStatuses: Record<string, BotStatus> = {};
    team.forEach(m => {
      initialStatuses[m.role] = 'thinking';
    });
    setStatuses(initialStatuses);

    // Add initial activity timeline step
    setActivityTimeline(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), teammate: 'Coordinator', text: 'Initiating multi-model research & drafting session...' }
    ]);

    // Transition to Drafting working animation state
    const workingTimer = setTimeout(() => {
      setStatuses(prev => {
        const next: Record<string, BotStatus> = {};
        team.forEach(m => {
          next[m.role] = 'working';
        });
        return next;
      });
      setActivityTimeline(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), teammate: 'AI Team', text: 'Drafting specialized analyses and cross-verifying insights...' }
      ]);
    }, 1200);

    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: mode || 'general',
          task: taskInput.trim(),
          team
        })
      });

      clearTimeout(workingTimer);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.trialUsed) {
          setTrialUsed(true);
        }
        throw new Error(errJson.error || 'Failed to orchestrate AI teammates');
      }

      const data = await res.json();
      setActiveSession(data.session);
      setOutputs(data.session.outputs || {});
      setSynthesis(data.session.synthesis || '');
      setTrialUsed(true);

      const finalStatuses: Record<string, BotStatus> = {};
      const newTimeline = [...activityTimeline];
      team.forEach(m => {
        const out = data.session.outputs?.[m.role];
        finalStatuses[m.role] = out?.error ? 'error' : 'done';
        newTimeline.push({
          timestamp: new Date().toLocaleTimeString(),
          teammate: `${m.name} (${m.role})`,
          text: out?.error ? 'Retrying analysis due to rate limit...' : `Refining ${m.name}'s draft and finalizing findings.`
        });
      });
      setStatuses(finalStatuses);
      setActivityTimeline(newTimeline);
      fetchStatus();
    } catch (err: any) {
      clearTimeout(workingTimer);
      console.error('Task orchestration error:', err);
      const errStatuses: Record<string, BotStatus> = {};
      team.forEach(m => {
        errStatuses[m.role] = 'error';
      });
      setStatuses(errStatuses);
      setSynthesis(`Error orchestrating task: ${err.message}`);
      setActivityTimeline(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), teammate: 'System', text: 'Retrying task execution...' }
      ]);
    } finally {
      setRunning(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSavePreset = async () => {
    if (!presetNameInput.trim() || team.length === 0) return;
    try {
      const token = getStoredToken();
      const preset = {
        id: `preset-${Date.now()}`,
        name: presetNameInput.trim(),
        mode: mode || 'general',
        team
      };
      const res = await fetch('/api/teammates/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ preset })
      });
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
        setPresetNameInput('');
        setShowPresetsModal(false);
      }
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', presetId })
      });
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#F5F4F0] text-[#111111] flex flex-col font-mono overflow-x-hidden">
      {/* Background diffuser */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F4F0]/70 via-[#F5F4F0]/85 to-[#F5F4F0]" />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        {/* Official Launch banner */}
        <div className="mb-6 px-4 py-3.5 bg-gradient-to-r from-[#111114] via-[#1E1E24] to-[#111114] border border-[#E8481C]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white shadow-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#E8481C] shrink-0" />
            <span><strong className="text-white">AI Teammates Officially Launched:</strong> The interactive 3D virtual office is live. Multi-model autonomous agents and executive meetings are available for all users.</span>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-[#E8481C] text-white rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 shadow-xs">
            Officially Live
          </span>
        </div>

        {isLocked ? (
          <div className="my-auto bg-white/95 backdrop-blur-md border border-[#E0DEDA] rounded-2xl p-6 sm:p-12 text-center max-w-xl mx-auto shadow-sm relative z-10 w-full">
            <div className="w-16 h-16 bg-[#FFF4F2] border border-[#fcdad5] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#E8481C]">
              <Lock className="w-8 h-8" />
            </div>
            <div className="inline-block px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold mb-3">
              Free Trial Completed
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] mb-3">Upgrade to Continue Using AI Teammates</h1>
            <p className="text-xs sm:text-sm text-[#5A5A5A] mb-8 leading-relaxed">
              You've used your 1 free trial run. Upgrade to Pro or Ultra to assemble coordinated multi-model AI teams and run tasks.
            </p>
            <button
              onClick={() => onNavigate('/flaw/billing')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-[#E8481C] text-white rounded-xl text-sm font-bold hover:bg-[#d63f15] transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Upgrade to Continue Using AI Teammates</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : loadingStatus ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8481C]" />
          </div>
        ) : !mode ? (
          /* MODE SELECTION SCREEN */
          <div className="my-auto max-w-3xl mx-auto text-center py-6 sm:py-10 w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E0DEDA] rounded-full text-xs font-semibold text-[#E8481C] mb-4">
              <Users className="w-3.5 h-3.5" />
              <span>Multi-Model Orchestration Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight mb-3">
              Choose Your AI Teammates Mode
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5A5A] mb-8 sm:mb-10 max-w-xl mx-auto px-2">
              Select how you want your coordinated team of AI models to research, write, and plan together today.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left">
              <button
                onClick={() => handleSelectMode('startup')}
                className="bg-white border-2 border-[#E0DEDA] hover:border-[#E8481C] rounded-2xl p-6 sm:p-8 transition-all cursor-pointer group flex flex-col justify-between shadow-xs min-h-[200px]"
              >
                <div>
                  <div className="w-12 h-12 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl flex items-center justify-center mb-4 text-[#111111] group-hover:bg-[#FFF4F2] group-hover:text-[#E8481C] transition-colors">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111111] mb-2">Startup Mode</h2>
                  <p className="text-xs text-[#5A5A5A] leading-relaxed mb-6">
                    Research and plan a business idea with an AI team. Tailored roles for market research, pitch copy, financial feasibility, and strategic roadmap.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#E8481C] min-h-[44px]">
                  <span>Select Startup Mode</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleSelectMode('general')}
                className="bg-white border-2 border-[#E0DEDA] hover:border-[#E8481C] rounded-2xl p-6 sm:p-8 transition-all cursor-pointer group flex flex-col justify-between shadow-xs min-h-[200px]"
              >
                <div>
                  <div className="w-12 h-12 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl flex items-center justify-center mb-4 text-[#111111] group-hover:bg-[#FFF4F2] group-hover:text-[#E8481C] transition-colors">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111111] mb-2">General Mode</h2>
                  <p className="text-xs text-[#5A5A5A] leading-relaxed mb-6">
                    Get any task done with a team of AI teammates. Task-agnostic roles for deep research, technical review, writing, and rigorous analysis.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#E8481C] min-h-[44px]">
                  <span>Select General Mode</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* THE OFFICE MAIN UI */
          <div className="flex flex-col flex-1 w-full">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-[#E0DEDA]/80 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <button
                  onClick={() => setMode(null)}
                  className="min-h-[44px] px-4 py-2.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-xs font-semibold hover:bg-white text-[#111111] transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#5A5A5A] shrink-0" />
                  <span>Change Mode ({mode === 'startup' ? 'Startup' : 'General'})</span>
                </button>
                <button
                  onClick={() => onNavigate('/flaw/teammates/setup')}
                  className="min-h-[44px] px-4 py-2.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-xs font-bold text-[#E8481C] hover:bg-white transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Configure API Keys (BYOK)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPresetsModal(true)}
                  className="min-h-[44px] px-3.5 py-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-xs font-semibold hover:bg-white text-[#111111] transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#5A5A5A] shrink-0" />
                  <span>Presets ({presets.length})</span>
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="min-h-[44px] px-3.5 py-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-xl text-xs font-semibold hover:bg-white text-[#111111] transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-[#5A5A5A] shrink-0" />
                  <span>History ({history.length})</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs: Chat (default) & Activity */}
            <div className="flex items-center gap-2 mb-6 border-b border-[#E0DEDA] pb-3">
              <button
                onClick={() => setActiveTab('chat')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 ${
                  activeTab === 'chat'
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-white text-[#5A5A5A] hover:text-[#111111] border border-[#E0DEDA]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat & Teammates</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 ${
                  activeTab === 'activity'
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-white text-[#5A5A5A] hover:text-[#111111] border border-[#E0DEDA]'
                }`}
              >
                <ActivityIcon className="w-3.5 h-3.5" />
                <span>Activity ({activityTimeline.length})</span>
              </button>
            </div>

            {activeTab === 'chat' ? (
              <>
                {/* 1. SEGMENTED TOGGLE: Chat | Meeting */}
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="inline-flex p-1 bg-white border border-[#E0DEDA] rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setChatSubMode('chat')}
                      className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        chatSubMode === 'chat'
                          ? 'bg-[#111111] text-white shadow-xs'
                          : 'text-[#5A5A5A] hover:text-[#111111]'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatSubMode('meeting')}
                      className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        chatSubMode === 'meeting'
                          ? 'bg-[#E8481C] text-white shadow-xs'
                          : 'text-[#5A5A5A] hover:text-[#111111]'
                      }`}
                    >
                      <Volume2 size={13} />
                      <span>Meeting</span>
                    </button>
                  </div>

                  {chatSubMode === 'meeting' ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#5A5A5A]">
                      <span className="w-2 h-2 rounded-full bg-[#E8481C] animate-pulse" />
                      <span>Roundtable Voice Discussion</span>
                    </div>
                  ) : (
                    <div className="text-xs text-[#7A7A7A]">
                      Direct prompt execution across all teammates
                    </div>
                  )}
                </div>

                {/* 3D VIRTUAL OFFICE BACKDROP WITH TEAMMATE ORBS OVERLAY */}
                <OfficeBackdrop
                  team={team}
                  statuses={statuses}
                  keys={keys}
                  managedProviders={managedProviders}
                  editingIndex={editingIndex}
                  onSelectEmployee={(idx) => startEditingName(idx)}
                  onAddEmployee={handleAddTeamMember}
                  speakingRole={isMeetingRunning ? meetingOfficeVisuals.speakingRole : null}
                  speakingTextSnippet={isMeetingRunning ? meetingOfficeVisuals.speakingTextSnippet : null}
                  pendingRole={isMeetingRunning ? meetingOfficeVisuals.pendingRole : null}
                  errorRoles={isMeetingRunning ? meetingOfficeVisuals.errorRoles : {}}
                />

                {/* MEETING MODE ACTIVE / SETUP VIEW */}
                {chatSubMode === 'meeting' && (
                  <div className="mb-8">
                    {isMeetingRunning ? (
                      <MeetingRoom
                        topic={meetingTopic}
                        team={team.filter((m) => selectedMeetingTeamIds.includes(m.id))}
                        onEndMeeting={(savedSession) => {
                          setIsMeetingRunning(false);
                          if (savedSession) {
                            setHistory((prev) => [savedSession, ...prev]);
                          }
                        }}
                        onUpdateOfficeVisuals={setMeetingOfficeVisuals}
                      />
                    ) : (
                      <div className="bg-white border border-[#E0DEDA] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E0DEDA] flex-wrap gap-2">
                          <div>
                            <h2 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                              <span>Start an Executive Voice Meeting</span>
                            </h2>
                            <p className="text-xs text-[#5A5A5A] mt-0.5">
                              Teammates debate your idea aloud around the table in 2 structured rounds followed by the coordinator's verdict.
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#E8481C] text-xs font-mono font-bold">
                            Web Speech Audio
                          </span>
                        </div>

                        {/* Meeting Topic Input */}
                        <div>
                          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-2">
                            Discussion Topic / Idea
                          </label>
                          <div className="relative rounded-xl">
                            <GlowingEffect
                              blur={0}
                              borderWidth={2}
                              spread={70}
                              glow={true}
                              disabled={false}
                              proximity={64}
                              inactiveZone={0.01}
                            />
                            <textarea
                              rows={3}
                              value={meetingTopic}
                              onChange={(e) => setMeetingTopic(e.target.value)}
                              placeholder="Enter the concept, strategic decision, or question you want the team to discuss..."
                              className="relative z-10 w-full p-3 bg-[#FAF9F5] border border-[#E0DEDA] rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none focus:border-[#E8481C]"
                            />
                          </div>
                        </div>

                        {/* Teammate Selection (2 to 5 members) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                              Select Teammates ({selectedMeetingTeamIds.length}/5 selected • Min 2)
                            </label>
                            <span className="text-[11px] text-[#7A7A7A]">Tap card to toggle</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {team.map((member) => {
                              const isSelected = selectedMeetingTeamIds.includes(member.id);
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => handleToggleMeetingMember(member.id)}
                                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-orange-50/70 border-[#E8481C] ring-2 ring-[#E8481C]/20 shadow-xs'
                                      : 'bg-white border-[#E0DEDA] opacity-50 hover:opacity-85'
                                  }`}
                                >
                                  <BotAvatar
                                    status={isSelected ? 'working' : 'idle'}
                                    provider={member.provider}
                                    employeeName={member.name}
                                    size={42}
                                    interactive={false}
                                  />
                                  <span className="text-xs font-bold text-[#111111] mt-1">{member.name}</span>
                                  <span className="text-[10px] text-[#5A5A5A] font-mono">{member.role}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer & Trigger */}
                        <div className="pt-4 border-t border-[#E0DEDA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-[11px] text-[#7A7A7A] space-y-0.5">
                            <p>• Counts as 1 AI Teammates run toward daily limit</p>
                            <p>• Speak to interrupt at any point via mic or typing</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleStartMeeting}
                            disabled={!meetingTopic.trim() || selectedMeetingTeamIds.length < 2 || selectedMeetingTeamIds.length > 5 || isLocked}
                            className="px-6 py-3 bg-[#E8481C] hover:bg-[#D03D14] disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                          >
                            <Volume2 size={15} />
                            <span>Start meeting</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TEAMMATE CARDS ROW */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xs uppercase tracking-widest text-[#5A5A5A] font-bold">
                        Assembled AI Employees ({team.length}/9)
                      </h2>
                      <span className="text-[11px] font-mono px-3 py-1 rounded-full font-bold bg-white/90 border border-[#E0DEDA] text-[#111111]">
                        {team.length}/9 active • {Math.max(0, 9 - team.length)} empty desks
                      </span>
                    </div>
                  </div>

                  {/* Teammate Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {team.map((member, idx) => {
                      const isConnected = Boolean(keys[member.provider]);
                      const isManagedAvailable = Boolean(managedProviders[member.provider]);
                      const isAvailable = isConnected || isManagedAvailable;
                      const status = statuses[member.role] || 'idle';
                      const isEditing = editingIndex === idx;

                      return (
                        <div
                          key={member.id || idx}
                          className={`bg-white border rounded-2xl p-5 relative flex flex-col justify-between transition-all shadow-xs ${
                            status === 'working'
                              ? 'border-[#E8481C] ring-2 ring-[#E8481C]/20 shadow-md'
                              : status === 'thinking'
                              ? 'border-amber-400 shadow-sm'
                              : status === 'error' || !isAvailable
                              ? 'border-red-400 bg-red-50/20'
                              : 'border-[#E0DEDA]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <BotAvatar
                                status={status}
                                provider={member.provider}
                                employeeName={member.name}
                                size={56}
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    isConnected
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isManagedAvailable
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {isConnected ? `${member.provider} • BYOK` : `Flawlesz-Managed (${member.provider})`}
                                </span>
                                <button
                                  onClick={() => handleRemoveTeamMember(idx)}
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50/75 rounded-xl transition-colors cursor-pointer"
                                  title="Remove teammate"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Employee Name & Rename */}
                            {isEditing ? (
                              <div className="p-3 bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl mb-3 space-y-2">
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEmployeeName(idx);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  autoFocus
                                  className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-lg text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E8481C]"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEmployeeName(idx)}
                                    className="flex-1 py-1.5 bg-[#E8481C] text-white rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-2 py-1.5 bg-[#E0DEDA] text-[#5A5A5A] rounded-lg text-xs cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mb-3">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="text-base font-black text-[#111111] truncate" title={member.name}>
                                    {member.name}
                                  </h3>
                                  <button
                                    onClick={() => startEditingName(idx)}
                                    className="text-zinc-400 hover:text-[#E8481C] p-1 rounded transition-colors cursor-pointer"
                                    title="Edit name"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[#5A5A5A]">
                                  <span className="font-semibold text-[#111111]">{member.role}</span>
                                  <span>•</span>
                                  <span className="uppercase text-[10px] font-mono">{member.provider}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Status with Shimmer / Teammate Status Lines */}
                          <div className="pt-3 border-t border-[#E0DEDA] mt-3 flex items-center justify-between text-xs">
                            <span className="text-[#5A5A5A] flex items-center gap-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                status === 'working' ? 'bg-[#E8481C] animate-ping' : status === 'thinking' ? 'bg-amber-500 animate-pulse' : status === 'done' ? 'bg-emerald-500' : 'bg-zinc-300'
                              }`} />
                              <span>Status:</span>
                            </span>
                            <span className="font-bold capitalize text-[#E8481C] animate-pulse">
                              {status === 'thinking'
                                ? 'Researching...'
                                : status === 'working'
                                ? `Refining ${member.name}'s draft...`
                                : status === 'error'
                                ? 'Retrying...'
                                : status === 'done'
                                ? 'Drafting...'
                                : 'Idle'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Custom Role Card */}
                    <div className="border-2 border-dashed rounded-2xl p-5 flex flex-col justify-between bg-[#F9F8F5] border-[#E0DEDA]">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold text-[#111111]">Hire Custom Employee</h3>
                          <span className="text-[10px] font-mono text-[#5A5A5A]">{team.length}/9 Desks</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Name (e.g. Alex)"
                          value={newEmployeeName}
                          onChange={(e) => setNewEmployeeName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-xl text-xs mb-2 focus:outline-none focus:border-[#E8481C]"
                        />
                        <input
                          type="text"
                          placeholder="Role (e.g. Legal, Security)"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-xl text-xs mb-2 focus:outline-none focus:border-[#E8481C]"
                        />
                      </div>
                      <button
                        onClick={handleAddCustomRole}
                        disabled={team.length >= 9 || !newRoleName.trim()}
                        className="w-full py-2 px-3 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Employee to Desk</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* CONVERSATION & TASK INPUT BAR */}
                <div className="mb-8">
                  <form onSubmit={handleRunTask} className="bg-white border border-[#E0DEDA] rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-3">
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder="Assign task to your AI Teammates (e.g. Research competitor pricing and draft executive summary)..."
                      className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#111111] placeholder:text-[#7A7A7A] focus:outline-none px-2 py-1 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!taskInput.trim() || running || team.length === 0}
                      className="cursor-pointer bg-[#E8481C] hover:bg-[#D03D14] text-white w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-xs"
                      title="Run task with AI Teammates"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>

                {/* RESULTS AREA */}
                {(Object.keys(outputs).length > 0 || synthesis) && (
                  <div className="mb-8 space-y-6">
                    <h2 className="text-xs uppercase tracking-widest text-[#5A5A5A] font-bold">
                      Teammate Results & Synthesis
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {team.map((member) => {
                        const out = outputs[member.role];
                        if (!out) return null;
                        return (
                          <div key={member.id} className="bg-white border border-[#E0DEDA] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between pb-3 border-b border-[#E0DEDA] mb-4 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <BotAvatar
                                    status={statuses[member.role] || 'done'}
                                    provider={member.provider}
                                    employeeName={member.name}
                                    size={40}
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-[#111111] block">
                                      {member.name} ({member.role})
                                    </span>
                                    <span className="text-[10px] text-[#5A5A5A] uppercase font-mono">
                                      {member.provider}
                                    </span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${out.error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                  {out.error ? 'Error' : 'Completed'}
                                </span>
                              </div>
                              <div className="text-xs text-[#5A5A5A] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {out.text || out.error}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {synthesis && (
                      <div className="bg-white border-2 border-[#E8481C] rounded-2xl p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E0DEDA] mb-4">
                          <div className="w-8 h-8 rounded-lg bg-[#FFF4F2] text-[#E8481C] flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h3 className="text-base font-black text-[#111111]">
                            Flawlesz Coordinator Synthesized Summary
                          </h3>
                        </div>
                        <div className="text-sm text-[#333333] leading-relaxed whitespace-pre-wrap">
                          {synthesis}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ACTIVITY TIMELINE TAB */
              <div className="bg-white border border-[#E0DEDA] rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#111111] mb-2">Autonomous Teammate Activity Timeline</h3>
                {activityTimeline.length === 0 ? (
                  <p className="text-xs text-[#5A5A5A] py-8 text-center">No activity recorded yet. Run a task in Chat to view the step-by-step timeline.</p>
                ) : (
                  <div className="space-y-3">
                    {activityTimeline.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl text-xs">
                        <span className="font-mono text-[10px] text-[#5A5A5A] shrink-0 pt-0.5">{item.timestamp}</span>
                        <div>
                          <span className="font-bold text-[#111111] block mb-0.5">{item.teammate}</span>
                          <span className="text-[#5A5A5A]">{item.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
      </main>

      {/* PRESETS MODAL */}
      <AnimatePresence>
        {showPresetsModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E0DEDA] rounded-2xl max-w-md w-full p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-[#111111] mb-4">Saved Team Presets</h3>
              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Preset Name"
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl text-xs"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetNameInput.trim() || team.length === 0}
                    className="px-4 py-2 bg-[#111111] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 mt-4">
                  {presets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between p-3 bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-[#111111]">{preset.name}</div>
                        <div className="text-[10px] text-[#5A5A5A]">{preset.team.length} members</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setMode(preset.mode);
                            setTeam(normalizeLoadedTeam(preset.team));
                            setShowPresetsModal(false);
                          }}
                          className="px-3 py-1 bg-[#E8481C] text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[#E0DEDA]">
                <button
                  onClick={() => setShowPresetsModal(false)}
                  className="px-4 py-2 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E0DEDA] rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[80vh] flex flex-col"
            >
              <h3 className="text-lg font-bold text-[#111111] mb-4">AI Teammate Office History</h3>
                      <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1">
                {history.length === 0 ? (
                  <p className="text-xs text-[#5A5A5A] text-center py-8">No completed office sessions yet.</p>
                ) : (
                  history.map((item) => {
                    const isMeeting = item.type === 'meeting';
                    return (
                      <div key={item.id} className="p-4 bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          {isMeeting ? (
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#E8481C] font-mono font-bold">
                              ROUNDTABLE MEETING
                            </span>
                          ) : (
                            <span className="text-[#5A5A5A]">Mode: {item.mode?.toUpperCase()}</span>
                          )}
                          <span className="text-[#5A5A5A]">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="font-bold text-[#111111]">
                          {isMeeting ? `Topic: ${item.topic || item.task}` : `Task: ${item.task}`}
                        </div>
                        {isMeeting ? (
                          <>
                            <div className="text-[11px] text-[#5A5A5A] font-mono">
                              {item.transcript?.length || 0} turns recorded • {item.team?.length || 0} participants
                            </div>
                            {item.summary && (
                              <div className="text-[#5A5A5A] line-clamp-2 text-xs italic">
                                "{item.summary}"
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingHistoryMeeting(item);
                                setShowHistoryModal(false);
                              }}
                              className="text-[#E8481C] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>View Transcript & Replay Voice</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-[#5A5A5A] line-clamp-2">{item.synthesis}</div>
                            <button
                              onClick={() => {
                                setMode(item.mode);
                                setTeam(normalizeLoadedTeam(item.team));
                                setOutputs(item.outputs || {});
                                setSynthesis(item.synthesis || '');
                                setShowHistoryModal(false);
                              }}
                              className="text-[#E8481C] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Session Results</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-end pt-4 border-t border-[#E0DEDA]">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEETING REPLAY MODAL */}
      <AnimatePresence>
        {viewingHistoryMeeting && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E0DEDA] rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E0DEDA] mb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#E8481C] font-mono text-[10px] font-bold uppercase">
                    Meeting Transcript & Voice Replay
                  </span>
                  <h3 className="text-base font-bold text-[#111111] mt-1">
                    "{viewingHistoryMeeting.topic || viewingHistoryMeeting.task}"
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    meetingVoice.stop();
                    setIsReplayingVoice(false);
                    setViewingHistoryMeeting(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Transcript list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
                {viewingHistoryMeeting.transcript?.map((entry: any, tIdx: number) => (
                  <div
                    key={entry.id || tIdx}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      entry.isUser
                        ? 'bg-blue-50/70 border-blue-200 text-blue-950 ml-6'
                        : entry.isCoordinator
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950 font-medium'
                        : 'bg-[#FAF9F5] border-[#E0DEDA] text-[#222222]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-black/5 text-[11px] font-mono font-bold">
                      <span>
                        {entry.speakerName} ({entry.speakerRole})
                      </span>
                      <span className="text-[#888888] font-normal">{entry.timestamp}</span>
                    </div>
                    <p>{entry.text}</p>
                  </div>
                ))}
              </div>

              {/* Footer controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E0DEDA] mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isReplayingVoice) {
                      meetingVoice.stop();
                      setIsReplayingVoice(false);
                    } else {
                      setIsReplayingVoice(true);
                      let idx = 0;
                      const transcript = viewingHistoryMeeting.transcript || [];
                      const playNext = () => {
                        if (idx >= transcript.length) {
                          setIsReplayingVoice(false);
                          return;
                        }
                        const item = transcript[idx];
                        meetingVoice.speakTurn(
                          item.speakerName,
                          item.speakerRole,
                          item.text,
                          undefined,
                          () => {
                            idx++;
                            playNext();
                          }
                        );
                      };
                      playNext();
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-[#111111] hover:bg-black text-white"
                >
                  {isReplayingVoice ? (
                    <>
                      <Square size={13} className="fill-current" />
                      <span>Stop Voice Replay</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-current" />
                      <span>Replay with Voice</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    meetingVoice.stop();
                    setIsReplayingVoice(false);
                    setViewingHistoryMeeting(null);
                  }}
                  className="px-4 py-2 bg-[#F5F4F0] border border-[#E0DEDA] hover:bg-[#EAE8E3] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
