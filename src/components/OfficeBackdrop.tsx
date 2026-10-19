import React, { useState, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Compass, RotateCcw, Maximize2, Minimize2, Eye, Focus, AlertCircle, Plus, Sparkles, UserPlus, X, Users } from 'lucide-react';
import { TeamMember } from '../pages/TeammatesOfficePage.tsx';
import { BotStatus } from './BotAvatar.tsx';
import { OfficeScene3D, WORKSTATION_CONFIGS } from './office3d/OfficeScene3D.tsx';
import { CameraPreset } from './office3d/CameraRig.tsx';

export interface OfficeBackdropProps {
  team: TeamMember[];
  statuses: Record<string, BotStatus>;
  keys: Record<string, string>;
  managedProviders: Record<string, boolean>;
  editingIndex: number | null;
  onSelectEmployee?: (idx: number) => void;
  onAddEmployee?: (member: TeamMember) => void;
  speakingRole?: string | null;
  speakingTextSnippet?: string | null;
  pendingRole?: string | null;
  errorRoles?: Record<string, string>;
}

// Error Boundary for Three.js Canvas to safeguard WebGL compatibility
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}
class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D Canvas render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const OfficeBackdrop: React.FC<OfficeBackdropProps> = ({
  team,
  statuses,
  keys,
  managedProviders,
  editingIndex,
  onSelectEmployee,
  onAddEmployee,
  speakingRole,
  speakingTextSnippet,
  pendingRole,
  errorRoles
}) => {
  const [explore3D, setExplore3D] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Add Teammate Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotRole, setNewBotRole] = useState('');
  const [newBotProvider, setNewBotProvider] = useState('groq');

  // Sync editingIndex from outside if user clicked edit in teammate card
  React.useEffect(() => {
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < team.length) {
      setSelectedMemberIndex(editingIndex);
      setSelectedEmptySlot(null);
      setActivePreset('teammate');
    }
  }, [editingIndex, team.length]);

  const handleToggleExplore = () => {
    if (explore3D) {
      setExplore3D(false);
      setActivePreset('overview');
      setSelectedMemberIndex(null);
      setSelectedEmptySlot(null);
    } else {
      setExplore3D(true);
      setActivePreset('free');
    }
  };

  const handleResetCamera = () => {
    setExplore3D(false);
    setActivePreset('overview');
    setSelectedMemberIndex(null);
    setSelectedEmptySlot(null);
  };

  const handleSelectPreset = (preset: CameraPreset, idx?: number) => {
    setExplore3D(false);
    setActivePreset(preset);
    setSelectedEmptySlot(null);

    if (preset === 'teammate' && typeof idx === 'number') {
      setSelectedMemberIndex(idx);
      if (idx < team.length && onSelectEmployee) {
        onSelectEmployee(idx);
      }
    } else {
      setSelectedMemberIndex(null);
    }
  };

  const handleSelectEmptyWorkstation = (slotIdx: number) => {
    setSelectedEmptySlot(slotIdx);
    setSelectedMemberIndex(slotIdx);
    setActivePreset('teammate');
    setShowAddModal(true);
  };

  const handleQuickAdd = (suggestedRole: string, suggestedName: string, provider = 'groq') => {
    if (!onAddEmployee) return;
    const newMember: TeamMember = {
      id: `custom-${Date.now()}-${team.length}`,
      name: suggestedName,
      role: suggestedRole,
      provider
    };
    onAddEmployee(newMember);
    setShowAddModal(false);
    setNewBotName('');
    setNewBotRole('');
  };

  const handleCustomAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotRole.trim() || !onAddEmployee) return;
    const assignedName = newBotName.trim() || `Bot ${team.length + 1}`;
    const newMember: TeamMember = {
      id: `custom-${Date.now()}-${team.length}`,
      name: assignedName,
      role: newBotRole.trim(),
      provider: newBotProvider
    };
    onAddEmployee(newMember);
    setShowAddModal(false);
    setNewBotName('');
    setNewBotRole('');
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const selectedMember =
    selectedMemberIndex !== null && selectedMemberIndex < team.length
      ? team[selectedMemberIndex]
      : null;

  const totalSlots = WORKSTATION_CONFIGS.length;
  const emptyCount = Math.max(0, totalSlots - team.length);

  return (
    <div className="w-full max-w-[1100px] mx-auto mb-8">
      {/* 3D Office Viewport Box */}
      <div
        ref={containerRef}
        className={`relative w-full aspect-video min-h-[390px] sm:min-h-[470px] md:min-h-[520px] rounded-[22px] border border-[#DDD9D2] overflow-hidden bg-[#ECE8E1] shadow-md select-none transition-all ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 aspect-auto h-screen w-screen' : ''
        }`}
      >
        {/* ================= REAL-TIME 3D THREE.JS CANVAS ================= */}
        <WebGLErrorBoundary
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#F5F2EB] text-[#1E2024]">
              <AlertCircle className="w-8 h-8 text-[#E8481C] mb-2" />
              <p className="font-bold text-sm">3D Graphics Acceleration Unavailable</p>
              <p className="text-xs text-[#7A7A7A] max-w-sm mt-1">
                Your browser or device does not have WebGL enabled. AI Teammate actions and chat remain fully functional.
              </p>
            </div>
          }
        >
          <OfficeScene3D
            team={team}
            statuses={statuses}
            keys={keys}
            managedProviders={managedProviders}
            editingIndex={editingIndex}
            onSelectEmployee={onSelectEmployee}
            onSelectEmptyWorkstation={handleSelectEmptyWorkstation}
            speakingRole={speakingRole}
            speakingTextSnippet={speakingTextSnippet}
            pendingRole={pendingRole}
            errorRoles={errorRoles}
            explore3D={explore3D}
            activePreset={activePreset}
            onPresetChange={setActivePreset}
            selectedMemberIndex={selectedMemberIndex}
            onSelectMemberIndex={setSelectedMemberIndex}
            badgeRefs={badgeRefs}
          />
        </WebGLErrorBoundary>

        {/* Ambient Top & Bottom Vignette for UI contrast */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-black/20" />

        {/* ================= SYNCHRONIZED 2D HTML OVERLAY LAYER ================= */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {WORKSTATION_CONFIGS.map((_, idx) => {
            const isOccupied = idx < team.length;
            const member = isOccupied ? team[idx] : null;

            if (isOccupied && member) {
              const isSpeaking = speakingRole === member.role;
              const isPending = pendingRole === member.role;
              const hasError = Boolean(errorRoles?.[member.role]);
              const status = hasError
                ? 'error'
                : isSpeaking
                ? 'working'
                : isPending
                ? 'thinking'
                : (statuses[member.role] || 'idle');
              const isSelected = selectedMemberIndex === idx || editingIndex === idx;

              return (
                <div
                  key={`badge-occupied-${member.id || idx}`}
                  ref={(el) => {
                    badgeRefs.current[idx] = el;
                  }}
                  className="absolute pointer-events-auto flex flex-col items-center transition-opacity duration-150"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -100%)',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                >
                  {/* Live Speaking Speech Bubble */}
                  {isSpeaking && speakingTextSnippet && (
                    <div className="mb-2 max-w-[270px] px-3.5 py-2 rounded-2xl bg-black/95 text-white border-2 border-[#E8481C] shadow-2xl text-[11px] leading-snug backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 text-center select-none">
                      <span className="text-[#FF6B3D] font-bold text-[10px] block uppercase tracking-wider mb-0.5">
                        Speaking aloud
                      </span>
                      "{speakingTextSnippet}"
                    </div>
                  )}

                  {/* Floating Teammate Workstation Badge */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('teammate', idx)}
                    className={`px-3 py-1.5 rounded-xl backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all cursor-pointer select-none ${
                      isSpeaking
                        ? 'bg-black/90 border-[#E8481C] text-white ring-2 ring-[#E8481C]/50 scale-105'
                        : isSelected
                        ? 'bg-[#111111]/95 border-white/60 text-white scale-105'
                        : 'bg-black/75 hover:bg-black/90 border-white/20 hover:border-white/50 text-white hover:scale-105'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        hasError
                          ? 'bg-red-500 animate-pulse'
                          : isSpeaking
                          ? 'bg-[#E8481C] animate-ping'
                          : status === 'thinking'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-[12px] font-bold tracking-tight leading-tight whitespace-nowrap">
                        {member.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#FF9E80] leading-none">
                        {member.role}
                      </span>
                    </div>
                  </button>
                </div>
              );
            } else {
              // Empty Workstation Badge (Invites Expansion)
              const isSelected = selectedMemberIndex === idx;

              return (
                <div
                  key={`badge-empty-${idx}`}
                  ref={(el) => {
                    badgeRefs.current[idx] = el;
                  }}
                  className="absolute pointer-events-auto flex flex-col items-center transition-opacity duration-150"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -100%)',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectEmptyWorkstation(idx)}
                    title={`Workstation ${idx + 1} Available - Click to configure new AI teammate`}
                    className={`px-2.5 py-1 rounded-xl backdrop-blur-md border shadow-md flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#E8481C] border-[#E8481C] text-white ring-2 ring-[#E8481C]/50 scale-105'
                        : 'bg-black/60 hover:bg-black/85 border-white/20 hover:border-[#E8481C]/60 text-white/90 hover:text-white hover:scale-105'
                    }`}
                  >
                    <Plus className="w-3 h-3 text-[#FF9E80]" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">
                      Desk {idx + 1} • Available
                    </span>
                  </button>
                </div>
              );
            }
          })}
        </div>

        {/* ================= TOP FLOATING NAVIGATION & CONTROLS HUD ================= */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-30 flex-wrap gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-sm text-[11px] font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xs:inline">Interactive 3D Office</span>
            <span className="text-white/40">•</span>
            <span className="text-[#FF9E80] font-mono">{team.length} Active</span>
            <span className="text-white/40">•</span>
            <span className="text-white/70 font-mono text-[10px]">{emptyCount} Desks Ready</span>
          </div>

          {/* Quick Preset View Selectors */}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-sm">
            <button
              type="button"
              onClick={() => handleSelectPreset('overview')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activePreset === 'overview' && !explore3D
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('conference')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activePreset === 'conference' && !explore3D
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Meeting Table
            </button>
            <div className="h-3 w-px bg-white/20 mx-1" />
            {/* Quick Teammate Chips */}
            {team.map((m, idx) => (
              <button
                key={`chip-${m.id}`}
                type="button"
                onClick={() => handleSelectPreset('teammate', idx)}
                title={`Focus ${m.name}'s Desk (${m.role})`}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  selectedMemberIndex === idx && !explore3D
                    ? 'bg-[#E8481C] text-white shadow-xs font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{m.name}</span>
              </button>
            ))}

            {/* Empty Desk Quick Add Button */}
            {emptyCount > 0 && (
              <button
                type="button"
                onClick={() => handleSelectEmptyWorkstation(team.length)}
                title="Add New Teammate to Available Workstation"
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-[#FF9E80] hover:text-white hover:bg-[#E8481C]/20 transition-all cursor-pointer flex items-center gap-1 ml-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Bot</span>
              </button>
            )}
          </div>

          {/* Camera Action Buttons (Explore 3D, Reset, Fullscreen) */}
          <div className="flex items-center gap-1.5">
            {/* Reset Camera Button */}
            {(explore3D || activePreset !== 'overview' || selectedMemberIndex !== null) && (
              <button
                type="button"
                onClick={handleResetCamera}
                title="Reset Camera to Overview"
                aria-label="Reset Camera View"
                className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-xs font-semibold text-white hover:bg-black/90 shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white/70" />
                <span className="hidden md:inline">Reset</span>
              </button>
            )}

            {/* ASSEMBLE BUTTON */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => console.log('Assemble bots!')}
                aria-label="Assemble AI Teammates"
                title="Assemble AI Teammates"
                className="px-3 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold backdrop-blur-md border shadow-sm transition-all cursor-pointer bg-white/95 text-[#111111] border-white/80 hover:bg-white hover:text-[#E8481C]"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="tracking-tight">Assemble</span>
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label="Toggle Fullscreen"
              className="p-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-black/90 shadow-xs transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ================= BOTTOM INTERACTIVE STATUS & HELP BAR ================= */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
          <div className="pointer-events-auto flex items-center gap-2">
            {selectedMember ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#E8481C]/50 text-white shadow-md text-xs">
                <Focus className="w-3.5 h-3.5 text-[#E8481C]" />
                <span>
                  Workstation:{' '}
                  <strong className="text-[#FF9E80] font-bold">{selectedMember.name}</strong> ({selectedMember.role})
                </span>
                {onSelectEmployee && selectedMemberIndex !== null && (
                  <button
                    type="button"
                    onClick={() => onSelectEmployee(selectedMemberIndex)}
                    className="ml-1 text-[10px] font-bold underline text-[#E8481C] hover:text-white cursor-pointer"
                  >
                    Edit details
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetCamera}
                  className="ml-1 text-[10px] text-white/50 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : selectedEmptySlot !== null ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#E8481C] text-white shadow-md text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FF9E80]" />
                <span>
                  Workstation #{selectedEmptySlot + 1}:{' '}
                  <strong className="text-[#FF9E80]">Available for Expansion</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="ml-1 px-2 py-0.5 rounded-md bg-[#E8481C] text-white text-[10px] font-bold hover:bg-[#d43f17] cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={handleResetCamera}
                  className="ml-1 text-[10px] text-white/50 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 text-[11px]">
                <Eye className="w-3 h-3 text-[#FF9E80]" />
                <span>Click any desk to focus • Click empty desk to expand • Drag to orbit</span>
              </div>
            )}
          </div>

          {/* Real-time Speaker / Activity Indicator */}
          {speakingRole && (
            <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#E8481C] text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#E8481C]" />
              <span>
                <strong className="text-[#FF9E80]">{speakingRole}</strong> speaking
              </span>
            </div>
          )}
        </div>

        {/* ================= MODAL: EXPAND TEAM TO AVAILABLE WORKSTATION ================= */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#16171B] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E8481C]/20 flex items-center justify-center text-[#E8481C]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Expand Your AI Team</h3>
                    <p className="text-[11px] text-white/60">
                      Furnished Workstation {typeof selectedEmptySlot === 'number' ? `#${selectedEmptySlot + 1}` : ''} is ready
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick 1-Click Specialist Roles */}
              <div className="mb-4">
                <label className="block text-[11px] font-mono uppercase text-white/60 mb-2">
                  Quick Add Recommended Specialist
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('Code Reviewer & QA', 'Orion', 'groq')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#E8481C]/20 border border-white/10 hover:border-[#E8481C]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-[#FF9E80]">
                      Orion
                    </div>
                    <div className="text-[10px] text-white/60">Code Reviewer & QA</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('Growth & Acquisition', 'Zephyr', 'groq')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#E8481C]/20 border border-white/10 hover:border-[#E8481C]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-[#FF9E80]">
                      Zephyr
                    </div>
                    <div className="text-[10px] text-white/60">Growth & Acquisition</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('Data & Intelligence', 'Lyra', 'perplexity')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#E8481C]/20 border border-white/10 hover:border-[#E8481C]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-[#FF9E80]">
                      Lyra
                    </div>
                    <div className="text-[10px] text-white/60">Data & Intelligence</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('Product Strategist', 'Aria', 'openai')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#E8481C]/20 border border-white/10 hover:border-[#E8481C]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-[#FF9E80]">
                      Aria
                    </div>
                    <div className="text-[10px] text-white/60">Product Strategist</div>
                  </button>
                </div>
              </div>

              {/* Custom Role Form */}
              <form onSubmit={handleCustomAddSubmit} className="space-y-3 pt-2 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-white/60 uppercase mb-1">
                      Teammate Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maya"
                      value={newBotName}
                      onChange={(e) => setNewBotName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E8481C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/60 uppercase mb-1">
                      AI Model Provider
                    </label>
                    <select
                      value={newBotProvider}
                      onChange={(e) => setNewBotProvider(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#22242A] border border-white/20 text-xs text-white focus:outline-none focus:border-[#E8481C]"
                    >
                      <option value="groq">Groq (Orbit / Pulsar / Quasar)</option>
                      <option value="openai">OpenAI</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="xai">xAI Grok</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-white/60 uppercase mb-1">
                    Specialized Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Security Architect"
                    value={newBotRole}
                    onChange={(e) => setNewBotRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E8481C]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBotRole.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#E8481C] hover:bg-[#d43f17] text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign to Desk</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
