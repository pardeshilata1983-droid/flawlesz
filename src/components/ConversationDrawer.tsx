import React, { useMemo } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { HistoryItem } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Plus,
  Trash2,
  X,
  Clock,
  ChevronRight,
  User,
  Activity,
  CreditCard,
  Search,
  Share2
} from 'lucide-react';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  currentHistoryId?: string | null;
  onSelectHistory: (item: HistoryItem) => void;
  onNewChat: () => void;
  onDeleteHistory: (id: string, e: React.MouseEvent) => void;
  onShareHistory?: (item: HistoryItem, e: React.MouseEvent) => void;
  loading: boolean;
  onNavigate?: (path: string) => void;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  history,
  currentHistoryId,
  onSelectHistory,
  onNewChat,
  onDeleteHistory,
  onShareHistory,
  loading,
  onNavigate
}) => {
  const { user } = useAuth();

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const unifiedItems = useMemo(() => {
    const items: Array<{ id: string; timestamp: number; title: string; subtitle: string; dateStr: string; ideaItem: HistoryItem }> = [];
    for (const h of history) {
      const ts = new Date(h.updatedAt || h.createdAt).getTime();
      items.push({
        id: `idea-${h.id}`,
        timestamp: isNaN(ts) ? 0 : ts,
        title: h.title || 'Untitled Idea Check',
        subtitle: h.summary || 'Validation report & competitive analysis',
        dateStr: formatRelativeTime(isNaN(ts) ? Date.now() : ts),
        ideaItem: h
      });
    }
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items;
  }, [history]);

  return (
    <>
      {isOpen && (
        <div
          id="conversation-drawer-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <div
        id="conversation-drawer-panel"
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-white border-r border-[#E0DEDA] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out font-mono ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E0DEDA] flex items-center justify-between bg-[#F9F8F5] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
              F
            </div>
            <span className="text-xs font-black uppercase tracking-tight text-[#111111]">
              History & Sessions
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1.5 text-[#5A5A5A] hover:text-[#111111] hover:bg-[#E0DEDA]/50 rounded-lg transition-colors"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Idea Check */}
        <div className="p-2.5 border-b border-[#E0DEDA] bg-white flex items-center gap-1.5 shrink-0">
          <button
            id="new-chat-drawer-btn"
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="cursor-pointer flex-1 bg-[#E8481C] hover:bg-[#D03D14] text-white text-[11px] font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            title="Start fresh idea check"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>New Idea Check</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="p-6 text-center text-xs font-mono flex items-center justify-center gap-2">
              <ThinkingOrb state="working" size={20} theme="light" />
              <span className="shimmer-text">Loading history...</span>
            </div>
          ) : unifiedItems.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <Clock className="w-6 h-6 text-[#7A7A7A] mx-auto mb-1 opacity-50" strokeWidth={1.5} />
              <p className="text-xs font-bold text-[#111111]">No past checks</p>
              <p className="text-[11px] text-[#5A5A5A] leading-relaxed max-w-xs mx-auto">
                Submit an idea to validate to populate your history.
              </p>
            </div>
          ) : (
            unifiedItems.map((item) => {
              const isSelected = currentHistoryId === item.ideaItem?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectHistory(item.ideaItem);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative cursor-pointer p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-white border-[#E8481C] ring-1 ring-[#E8481C]/25 shadow-xs'
                      : 'bg-white border-[#E0DEDA] hover:border-[#111111]/40 hover:bg-[#F9F8F5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">
                      <Search className="w-2.5 h-2.5 text-[#5A5A5A]" />
                      <span>Idea Check</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#8C8C8C] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.dateStr}</span>
                    </span>
                  </div>

                  <div className="pr-6">
                    <h4 className="text-xs font-bold text-[#111111] line-clamp-1 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#5A5A5A] mt-0.5 line-clamp-1 font-sans">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#7A7A7A] pt-1.5 border-t border-[#E0DEDA]/50">
                    <div className="flex items-center gap-1.5">
                      {item.ideaItem?.messages && item.ideaItem.messages.length > 0 && (
                        <span className="bg-[#F5F4F0] border border-[#E0DEDA] px-1 py-0.2 rounded text-[9px] text-[#111111] font-mono">
                          {item.ideaItem.messages.length} replies
                        </span>
                      )}
                    </div>
                    <span className="text-[#111111] group-hover:text-[#E8481C] group-hover:translate-x-0.5 transition-all flex items-center gap-0.5 font-bold">
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                    {onShareHistory && (
                      <button
                        type="button"
                        title="Share report"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareHistory(item.ideaItem, e);
                        }}
                        className="cursor-pointer p-1 text-[#7A7A7A] hover:text-[#111111] hover:bg-[#EAE8E2] rounded transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete check"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHistory(item.ideaItem.id, e);
                      }}
                      className="cursor-pointer p-1 text-[#7A7A7A] hover:text-[#E8481C] hover:bg-rose-50 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Account & Usage Links */}
        <div className="p-2 border-t border-[#E0DEDA] bg-white space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/flaw/account');
                onClose();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] hover:bg-[#F5F4F0] rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#111111]" />
              <span>Account</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#7A7A7A]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/flaw/usage');
                onClose();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] hover:bg-[#F5F4F0] rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#111111]" />
              <span>Usage & Limits</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#7A7A7A]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/flaw/billing');
                onClose();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] hover:bg-[#F5F4F0] rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[#111111]" />
              <span>Billing & Plans</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#7A7A7A]" />
          </button>
        </div>
      </div>
    </>
  );
};
