import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { useAuth } from '../context/AuthContext.tsx';
import { validateIdea, saveToGallery, fetchUserHistory, deleteHistoryItem, sendFollowUpChat, fetchUsageMetrics } from '../services/api.ts';
import { ValidationResult, HistoryItem, UploadedFile, ChatMessage, UsageMetrics } from '../types.ts';
import { CompetitorCard } from '../components/CompetitorCard.tsx';
import { FlawCard } from '../components/FlawCard.tsx';
import { RefinementCard } from '../components/RefinementCard.tsx';
import { GraveyardSection } from '../components/GraveyardSection.tsx';
import { ResultsErrorBoundary } from '../components/ResultsErrorBoundary.tsx';
import { ConversationDrawer } from '../components/ConversationDrawer.tsx';
import { ShareModal } from '../components/ShareModal.tsx';
import { FileAttachmentCard } from '../components/FileAttachmentCard.tsx';
import { AudioTeardownPlayer } from '../components/AudioTeardownPlayer.tsx';
import { processUploadedFile } from '../utils/fileExtractor.ts';
import { exportAnalysisToJsPdf } from '../utils/pdfExport.ts';
import { ttsManager, TTSState } from '../utils/audioTTS.ts';
import { extractUrlsFromText, getDomainFromUrl } from '../utils/urlHelper.ts';
import { HlsBackgroundVideo, BackgroundVideoSource } from '../components/HlsBackgroundVideo.tsx';
import {
  triggerAiCompletionNotification,
  requestPermissionOnFirstSubmit,
  recordActivity,
  checkAndTriggerPromo
} from '../services/notificationManager.ts';
import ReactMarkdown from 'react-markdown';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  RefreshCw,
  Share2,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Users,
  Download,
  ExternalLink,
  History,
  Paperclip,
  Mic,
  MicOff,
  Plus,
  Compass,
  Lightbulb,
  Zap,
  UploadCloud,
  FileText,
  Loader2,
  Volume2,
  VolumeX,
  Square,
  X,
  ChevronDown,
  Lock,
  Hammer,
  Code2,
  Globe,
  Scale,
  FileCheck,
  HelpCircle,
  Shield,
  AlertTriangle,
  Skull
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModelId, MODELS, computeUserModelStatuses, ModelStatus } from '../config/plans.ts';

interface SubmitPageProps {
  onNavigate: (path: string, initialIdea?: string) => void;
  initialIdea?: string;
}

const SAMPLE_IDEAS = [
  'What do you want checked or done?',
  'Validate a startup idea: On-demand mobile car wash service where vans wash parked cars overnight.',
  'Audit my website: Test conversion and page performance for https://example.com.',
  'Explain this report in plain language: Translate my medical lab test results into everyday terms.',
  'Review my resume: Identify weaknesses and missing details for a senior product designer role.',
  'Compare two quotes: Compare two contractor quotes for software development and spot hidden risks.'
];

export interface QuickStartOption {
  id: string;
  label: string;
  category: string;
  prompt: string;
  icon: any;
}

const QUICK_STARTS: QuickStartOption[] = [
  {
    id: 'startup',
    label: 'Validate a startup idea',
    category: 'Startup Validation',
    prompt: 'Validate my startup idea: An on-demand mobile car wash service where autonomous vans wash parked cars overnight using waterless cleaning agents.',
    icon: Lightbulb
  },
  {
    id: 'audit',
    label: 'Audit my website',
    category: 'Website Audit',
    prompt: 'Audit my website for conversion, UX, and messaging: https://example.com',
    icon: Globe
  },
  {
    id: 'report',
    label: 'Explain this report in plain language',
    category: 'Document Review',
    prompt: 'Explain this report in plain language: summarize what it describes, point out any values marked outside the normal range, and list questions to ask a doctor.',
    icon: FileText
  },
  {
    id: 'resume',
    label: 'Review my resume',
    category: 'Resume Review',
    prompt: 'Review my resume for a senior product designer role: highlight weak points, missing quantifiable metrics, and 5 concrete fixes.',
    icon: FileCheck
  },
  {
    id: 'quotes',
    label: 'Compare two quotes',
    category: 'Comparison',
    prompt: 'Compare two contractor quotes for software development: compare pricing, delivery scope, assumptions, and spot hidden risks.',
    icon: Scale
  }
];

const LOADING_STEPS: Array<{ text: string; state: 'searching' | 'connecting' | 'solving' | 'weaving' }> = [
  { text: 'Checking context & sources...', state: 'searching' },
  { text: 'Analyzing key findings...', state: 'connecting' },
  { text: 'Evaluating risks & open questions...', state: 'solving' },
  { text: 'Synthesizing plain-language results...', state: 'weaving' }
];

const FOLLOW_UP_STEPS: Array<{ text: string; state: 'working' | 'solving' | 'connecting' | 'composing' }> = [
  { text: 'Analyzing follow-up...', state: 'working' },
  { text: 'Evaluating questions...', state: 'solving' },
  { text: 'Reviewing verified context...', state: 'connecting' },
  { text: 'Formulating clear answer...', state: 'composing' }
];

function getGreeting(email?: string): string {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 18) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 18 || hour < 5) {
    timeGreeting = 'Good evening';
  }

  if (!email) return timeGreeting;

  // Extract first name from email (e.g. "lata.pardeshi@gmail.com" -> "Lata", "alex123@gmail.com" -> "Alex")
  const localPart = email.split('@')[0];
  const firstWord = localPart.split(/[._+-]/)[0].replace(/[0-9]/g, '');
  if (firstWord && firstWord.length >= 2) {
    const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    return `${timeGreeting}, ${capitalized}`;
  }

  return timeGreeting;
}

const RenderClickableText: React.FC<{ text: string }> = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`[\]]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//i)) {
          const cleanUrl = part.replace(/[.,;:!?)\],>]+$/, '');
          const trailing = part.slice(cleanUrl.length);
          return (
            <React.Fragment key={index}>
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[#E8481C] hover:text-[#D03D14] inline-flex items-center gap-1 font-medium transition-colors cursor-pointer break-all"
                title={`Open ${cleanUrl} in new tab`}
              >
                <span>{cleanUrl}</span>
                <ExternalLink className="w-3 h-3 inline-block shrink-0" />
              </a>
              {trailing}
            </React.Fragment>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

export const SubmitPage: React.FC<SubmitPageProps> = ({ onNavigate, initialIdea = '' }) => {
  const { user, updateUser, refreshUser, loading: authLoading } = useAuth();
  const [ideaText, setIdeaText] = useState(initialIdea);

  useEffect(() => {
    if (initialIdea) {
      setIdeaText(initialIdea);
    }
  }, [initialIdea]);
  const [validating, setValidating] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedGallery, setSavedGallery] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);

  // File Upload State
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [keepAttachment, setKeepAttachment] = useState(false);

  // Typewriter rotating placeholder state
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // History Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Voice simulation state
  const [isListening, setIsListening] = useState(false);

  // Dynamic Model Access Entitlements from DB/User Profile
  const userModelStatuses = useMemo(() => {
    return computeUserModelStatuses(user || undefined);
  }, [user]);

  // Usage Telemetry State (25 Free, 50 Pro, 100 Ultra, Unlimited Owner)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);

  const loadUsage = async () => {
    try {
      const data = await fetchUsageMetrics();
      setUsageMetrics(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);

  const isOwner = Boolean(
    usageMetrics?.isOwner ||
    (user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
    user?.role === 'admin'
  );
  const isOutOfChecks = !isOwner && Boolean(usageMetrics && usageMetrics.checksRemainingThisMonth <= 0);

  // Model selection for Validator: defaults to 'orbit' for every user, users can manually switch to higher models
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try {
      localStorage.removeItem('flaw_validator_selected_tier');
      const saved = localStorage.getItem('flaw_validator_selected_model');
      if (saved === 'orbit' || saved === 'pulsar' || saved === 'quasar') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'orbit';
  });

  // Guard: if current model becomes locked (e.g. after trial is consumed), fall back safely to Orbit
  useEffect(() => {
    const status = userModelStatuses[selectedModel];
    if (status && !status.isUnlocked) {
      setSelectedModel('orbit');
      try {
        localStorage.setItem('flaw_validator_selected_model', 'orbit');
      } catch {}
    }
  }, [userModelStatuses, selectedModel]);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (modelId: ModelId) => {
    const status = userModelStatuses[modelId];
    if (!status.isUnlocked) {
      // Locked model: do not select, do not change background video. Open pricing page instead!
      setIsModelDropdownOpen(false);
      onNavigate('/flaw/billing');
      return;
    }
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    try {
      localStorage.setItem('flaw_validator_selected_model', modelId);
    } catch {
      // ignore
    }
  };

  // Follow-up conversation state
  const [followUpMessages, setFollowUpMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [inspectingDomain, setInspectingDomain] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [isPlanToBuild, setIsPlanToBuild] = useState(false);

  // Audio TTS State
  const [ttsState, setTtsState] = useState<TTSState>(ttsManager.getState());

  useEffect(() => {
    const unsub = ttsManager.subscribe((s) => setTtsState(s));
    return () => unsub();
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const followUpBottomRef = useRef<HTMLDivElement>(null);

  // Fetch real conversation history from database
  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const items = await fetchUserHistory();
      setHistory(items);
    } catch (e) {
      console.error('[SUBMIT PAGE] Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Promotional notifications check & user activity tracking
  useEffect(() => {
    recordActivity();
    checkAndTriggerPromo();

    const handleUserActivity = () => {
      recordActivity();
    };

    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [onNavigate]);

  // File handling helpers
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    setIsUploading(true);
    setError(null);
    try {
      const parsedResults: UploadedFile[] = [];
      for (const file of fileArray) {
        console.log(`[SUBMIT PAGE] Processing file: ${file.name} (${file.size} bytes)`);
        const parsed = await processUploadedFile(file);
        parsedResults.push(parsed);
      }
      setAttachedFiles((prev) => [...prev, ...parsedResults]);
    } catch (err: any) {
      console.error('[SUBMIT PAGE] File upload/parsing error:', err);
      setError(err.message || 'Failed to process attached file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Rotating typewriter animation for empty & unfocused textarea placeholder
  useEffect(() => {
    // If the textarea has user content or is currently focused, do not animate placeholder
    if (ideaText || isFocused) {
      setPlaceholderText('');
      return;
    }

    let ideaIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const typeLoop = () => {
      const currentIdea = SAMPLE_IDEAS[ideaIndex];

      if (!isDeleting) {
        // Typing: ~35ms per character
        charIndex++;
        setPlaceholderText(currentIdea.slice(0, charIndex));

        if (charIndex >= currentIdea.length) {
          // Hold fully typed idea for 1.8s before deleting
          isDeleting = true;
          timeoutId = setTimeout(typeLoop, 1800);
        } else {
          timeoutId = setTimeout(typeLoop, 35);
        }
      } else {
        // Deleting: ~20ms per character
        charIndex--;
        setPlaceholderText(currentIdea.slice(0, charIndex));

        if (charIndex <= 0) {
          isDeleting = false;
          ideaIndex = (ideaIndex + 1) % SAMPLE_IDEAS.length;
          // Brief pause before typing next example
          timeoutId = setTimeout(typeLoop, 300);
        } else {
          timeoutId = setTimeout(typeLoop, 20);
        }
      }
    };

    // Start typing
    timeoutId = setTimeout(typeLoop, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ideaText, isFocused]);

  // Blinking cursor interval while placeholder is active
  useEffect(() => {
    if (ideaText || isFocused) return;

    const blinkInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 450);

    return () => clearInterval(blinkInterval);
  }, [ideaText, isFocused]);

  // Sync initialIdea if provided (e.g., from gallery iteration)
  useEffect(() => {
    if (initialIdea) {
      setIdeaText(initialIdea);
    }
  }, [initialIdea]);

  // Loading message rotator for both validation and follow-up
  useEffect(() => {
    let interval: any;
    if (validating || sendingFollowUp) {
      setLoadingStepIndex(0);
      const steps = validating
        ? LOADING_STEPS
        : inspectingDomain
        ? [
            { text: `Reading ${inspectingDomain}...`, state: 'connecting' as const },
            { text: `Analyzing ${inspectingDomain} content...`, state: 'solving' as const },
            { text: 'Formulating grounded response...', state: 'weaving' as const },
          ]
        : FOLLOW_UP_STEPS;
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % steps.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [validating, sendingFollowUp, inspectingDomain]);

  const greeting = user?.email ? getGreeting(user.email) : 'Welcome, Founder';

  const handleSubmit = async (e?: React.FormEvent, customIdea?: string) => {
    if (e) e.preventDefault();
    console.log('[SUBMIT PAGE] "Find the Flaws" button clicked.');

    // Request native browser permission on first Find Flaws click if default
    requestPermissionOnFirstSubmit();
    recordActivity();

    const promptToValidate = customIdea !== undefined ? customIdea : ideaText;
    const trimmed = promptToValidate.trim();

    // Check if we have text OR uploaded file
    const hasAttachments = attachedFiles.length > 0;
    if (!trimmed && !hasAttachments) {
      setError('Please describe your idea or upload a pitch deck/document before finding flaws.');
      textareaRef.current?.focus();
      return;
    }

    if (!hasAttachments && trimmed.length < 10) {
      setError('Please provide more detail (at least 10 characters) for a rigorous evaluation.');
      textareaRef.current?.focus();
      return;
    }

    if (isPlanToBuild) {
      onNavigate('/flaw/teammates', trimmed);
      return;
    }

    setError(null);
    setValidating(true);
    setSavedGallery(false);
    console.log('[SUBMIT PAGE] Triggering API call to /api/validate-idea...');

    // Combine attached file texts
    const combinedAttachmentText = attachedFiles
      .map((f) => `=== Attached File: ${f.name} ===\n${f.content}`)
      .join('\n\n');
    const attachmentNames = attachedFiles.map((f) => f.name).join(', ');

    try {
      const data = await validateIdea(trimmed, combinedAttachmentText, attachmentNames, selectedModel);
      console.log('[SUBMIT PAGE] Validation completed successfully with model', selectedModel, data);

      if ((data as any)?.user && updateUser) {
        updateUser((data as any).user);
      }

      // Safe normalization of all array and general skill fields
      const safeData: ValidationResult = {
        id: data?.id || `val-${Date.now()}`,
        idea: data?.idea || trimmed,
        skill: data?.skill,
        model: selectedModel,
        short_answer: data?.short_answer,
        key_findings: Array.isArray(data?.key_findings) ? data.key_findings : [],
        risks_or_questions: Array.isArray(data?.risks_or_questions) ? data.risks_or_questions : [],
        next_steps: Array.isArray(data?.next_steps) ? data.next_steps : [],
        disclaimer: data?.disclaimer,
        computed_palette: data?.computed_palette,
        similar_products: Array.isArray(data?.similar_products) ? data.similar_products : [],
        flaws: Array.isArray(data?.flaws) ? data.flaws : [],
        refined_versions: Array.isArray(data?.refined_versions) ? data.refined_versions : [],
        graveyard: Array.isArray(data?.graveyard) ? data.graveyard : [],
        messages: [],
        createdAt: data?.createdAt || new Date().toISOString(),
        userId: data?.userId,
        userEmail: data?.userEmail,
        savedToGallery: Boolean(data?.savedToGallery),
      };

      setResult(safeData);
      if (safeData.graveyard && safeData.graveyard.length > 0) {
        try {
          sessionStorage.setItem('flawlesz_latest_graveyard', JSON.stringify(safeData.graveyard));
        } catch {}
      }
      setFollowUpMessages([]);
      setFollowUpInput('');
      setCurrentHistoryId(safeData.id);

      // Private by default: delete attached file from memory after response unless user chose to keep it
      if (!keepAttachment) {
        setAttachedFiles([]);
      }

      // Instantly prepend new conversation to drawer state for immediate UI update
      const cleanIdea = safeData.idea.trim().replace(/^e\.g\.,?\s*/i, '');
      const words = cleanIdea.split(/\s+/);
      const title = words.length > 7 ? words.slice(0, 7).join(' ') + '...' : cleanIdea;
      const compCount = safeData.similar_products.length;
      const flawCount = safeData.flaws.length;
      const isGeneral = Boolean(safeData.skill && safeData.skill !== 'idea_validation' && (safeData.short_answer || (safeData.key_findings && safeData.key_findings.length > 0)));
      const summary = isGeneral
        ? `${(safeData.key_findings || []).length} key findings • ${(safeData.risks_or_questions || []).length} risks/questions`
        : `${compCount} existing ${compCount === 1 ? 'competitor' : 'competitors'} • ${flawCount} critical ${flawCount === 1 ? 'flaw' : 'flaws'}`;

      const newHistoryItem: HistoryItem = {
        id: safeData.id,
        userId: safeData.userId || user?.id || '',
        userEmail: safeData.userEmail || user?.email || '',
        idea: safeData.idea,
        title,
        summary,
        result: {
          skill: safeData.skill,
          short_answer: safeData.short_answer,
          key_findings: safeData.key_findings,
          risks_or_questions: safeData.risks_or_questions,
          next_steps: safeData.next_steps,
          disclaimer: safeData.disclaimer,
          similar_products: safeData.similar_products,
          flaws: safeData.flaws,
          refined_versions: safeData.refined_versions,
          graveyard: safeData.graveyard,
        },
        messages: [],
        createdAt: safeData.createdAt,
      };
      setHistory((prev) => [newHistoryItem, ...prev.filter((h) => h.id !== safeData.id)]);

      // Refresh drawer history to ensure full synchronization with database
      loadHistory();

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);

      // Trigger functional notification if the browser tab/window is inactive
      const isTabInactive = typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus());
      if (isTabInactive) {
        console.log('[SUBMIT PAGE] AI validation completed in background. Firing browser notification.');
        triggerAiCompletionNotification({
          type: 'idea_validation',
          ideaTitle: safeData.idea,
          flawCount: safeData.flaws.length,
          competitorCount: safeData.similar_products.length,
          onClick: () => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    } catch (err: any) {
      console.error('[SUBMIT PAGE] Validation error caught:', err);
      setError(
        err.message ||
        'Unable to complete validation at this time. Please check your network connection and try again.'
      );
    } finally {
      setValidating(false);
    }
  };

  const handleRunDemoIdea = () => {
    const demoIdea =
      'An on-demand mobile car wash service where autonomous vans drive to parked cars and wash them overnight using waterless cleaning agents.';
    console.log('[SUBMIT PAGE] Running instant Demo Idea validation');
    setIdeaText(demoIdea);
    handleSubmit(undefined, demoIdea);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    console.log('[SUBMIT PAGE] Loaded historical conversation:', item.id);
    setCurrentHistoryId(item.id);
    setIdeaText(item.idea);
    const msgs = Array.isArray(item.messages) ? item.messages : [];
    setFollowUpMessages(msgs);
    setFollowUpInput('');
    setResult({
      id: item.id,
      idea: item.idea,
      similar_products: Array.isArray(item.result?.similar_products) ? item.result.similar_products : [],
      flaws: Array.isArray(item.result?.flaws) ? item.result.flaws : [],
      refined_versions: Array.isArray(item.result?.refined_versions) ? item.result.refined_versions : [],
      messages: msgs,
      createdAt: item.createdAt,
      userId: item.userId,
      userEmail: item.userEmail
    });
    setError(null);
    setSavedGallery(false);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleNewChat = () => {
    console.log('[SUBMIT PAGE] Starting new check/chat session');
    setResult(null);
    setFollowUpMessages([]);
    setFollowUpInput('');
    setIdeaText('');
    setAttachedFiles([]);
    setCurrentHistoryId(null);
    setError(null);
    setSavedGallery(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (currentHistoryId === id) {
        setCurrentHistoryId(null);
      }
    } catch (err) {
      console.error('[SUBMIT PAGE] Failed to delete history item:', err);
    }
  };

  const handleSelectRefinedVersion = (refinedIdea: string) => {
    console.log('[SUBMIT PAGE] User selected refined version to iterate upon:', refinedIdea);
    setIdeaText(refinedIdea);
    setResult(null);
    setFollowUpMessages([]);
    setFollowUpInput('');
    setCurrentHistoryId(null);
    setSavedGallery(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 200);
  };

  const handleSaveToGallery = async () => {
    if (!result || savedGallery || savingGallery) return;
    console.log('[SUBMIT PAGE] Publishing result to public gallery...');
    setSavingGallery(true);
    try {
      await saveToGallery({
        ...result,
        messages: followUpMessages,
      });
      setSavedGallery(true);
      console.log('[SUBMIT PAGE] Successfully published to gallery.');
    } catch (err: any) {
      console.error('[SUBMIT PAGE] Error saving to gallery:', err);
      setError(err.message || 'Failed to save to gallery.');
    } finally {
      setSavingGallery(false);
    }
  };

  // Official Idea Sharing state and handler
  const [shareModalData, setShareModalData] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleOpenShare = async (dataToShare?: any) => {
    const activeData = dataToShare || (result ? {
      id: result.id,
      idea: result.idea,
      flaws: result.flaws,
      similar_products: result.similar_products,
      refined_versions: result.refined_versions,
      graveyard: result.graveyard,
      messages: followUpMessages,
      createdAt: result.createdAt,
    } : null);

    if (!activeData) return;

    // Mobile Web Share API support
    if (typeof window !== 'undefined' && window.innerWidth < 768 && typeof navigator !== 'undefined' && navigator.share) {
      const shareUrl = `${window.location.origin}/share/${activeData.id}`;
      try {
        await navigator.share({
          title: `FLAWLESZ AI — "${activeData.idea.slice(0, 50)}"`,
          text: `Check out this stress-tested startup breakdown on FLAWLESZ AI: "${activeData.idea}". Know Before You Build.`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('[SUBMIT PAGE] Mobile native share error, opening modal:', err);
      }
    }

    setShareModalData(activeData);
    setIsShareModalOpen(true);
  };

  const handleSendFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = followUpInput.trim();
    if (!query || sendingFollowUp || !result) return;

    // Detect URL before sending to trigger URL-specific handling and loading state
    const detectedUrls = extractUrlsFromText(query);
    if (detectedUrls.length > 0) {
      const domain = getDomainFromUrl(detectedUrls[0]);
      setInspectingDomain(domain);
    } else {
      setInspectingDomain(null);
    }

    setFollowUpInput('');
    setSendingFollowUp(true);
    setFollowUpError(null);
    setError(null);

    const activeIsPlanToBuild = isPlanToBuild;
    const isCodingTask =
      activeIsPlanToBuild ||
      /\b(build|code|app|component|api|frontend|backend|page|scaffold|saas|ui|dashboard|react|develop|fix|function|database|implement)\b/i.test(
        query
      );

    if (activeIsPlanToBuild) {
      onNavigate('/flaw/teammates', query);
      return;
    }

    const tempUserMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: activeIsPlanToBuild ? `🛠️ [Plan to Build Task] ${query}` : query,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update conversation
    const optimisticList = [...followUpMessages, tempUserMsg];
    setFollowUpMessages(optimisticList);

    setTimeout(() => {
      followUpBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);

    try {
      const response = await sendFollowUpChat({
        historyId: currentHistoryId || result.id,
        idea: result.idea,
        similar_products: result.similar_products || [],
        flaws: result.flaws || [],
        refined_versions: result.refined_versions || [],
        messages: followUpMessages,
        newMessage: query,
        mode: activeIsPlanToBuild ? 'plan_to_build' : 'chat',
        isPlanToBuild: activeIsPlanToBuild
      });

      const updated = response.messages;
      setFollowUpMessages(updated);
      setResult((prev) => prev ? { ...prev, messages: updated } : prev);

      // Re-sync user history drawer
      loadHistory();

      setTimeout(() => {
        followUpBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);

      // Trigger functional notification if the browser tab/window is inactive
      const isTabInactive = typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus());
      if (isTabInactive) {
        console.log('[SUBMIT PAGE] AI follow-up completed in background. Firing browser notification.');
        const botMessages = updated.filter((m) => m.role === 'assistant');
        const lastBotMsg = botMessages[botMessages.length - 1];
        triggerAiCompletionNotification({
          type: 'follow_up',
          previewText: lastBotMsg?.content || 'AI response is ready.',
          onClick: () => {
            followUpBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    } catch (err: any) {
      console.error('[SUBMIT PAGE] Error sending follow-up:', err);
      const errMsg = err?.message || 'Failed to send follow-up message. Please try again.';
      setFollowUpError(errMsg);
      setError(errMsg);
      // Remove optimistic message if error occurred
      setFollowUpMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSendingFollowUp(false);
      setInspectingDomain(null);
    }
  };

  // Configurable rotation interval in hours (adjust this to change frequency, e.g. 6 hours)
  const ROTATION_INTERVAL_HOURS = 6;

  // Video sources rotated based on clock-time (modulo calculation over Unix epoch)
  const VALIDATOR_VIDEO_SOURCES: BackgroundVideoSource[] = [
    {
      src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_032550_4c49689d-a215-41e0-bb76-8ef78f562429.mp4',
      poster: '/validator-bg-poster.jpg?v=4',
      label: 'Atmosphere Loop 1',
    },
    {
      src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_202655_a7f5aca0-2f80-4bc9-bcb5-96ac95662003.mp4',
      poster: '/validator-bg-poster-2.jpg?v=4',
      label: 'Atmosphere Loop 2',
    },
  ];

  // Video background is active across validator and follow-up chat views, with a soft diffuser during analysis results
  const isVideoBackgroundActive = true;
  const isGlassMode = !result || validating;

  const canSubmit = !validating && (ideaText.trim().length > 0 || attachedFiles.length > 0);

  return (
    <div
      className={`relative min-h-screen ${
        isGlassMode ? 'bg-[#080B10] text-white' : 'bg-[#F5F4F0] text-[#111111]'
      } pb-36 overflow-x-clip`}
    >
      {/* Hidden file input supporting PDF, Docs, Text, CSV, JSON, and Images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,.txt,.md,.markdown,.json,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
        className="hidden"
      />

      {/* ─────────────────────────────────────────────────────────────
          SCOPED VALIDATOR BACKGROUND VIDEO LAYERS:
          - Orbit: Standard rotating atmosphere video (HlsBackgroundVideo)
          - Pulsar: Streamable embed https://streamable.com/e/jtqker
          - Quasar: Streamable embed https://streamable.com/e/7f2p9g
          - Smooth 500ms opacity crossfade between backgrounds
         ───────────────────────────────────────────────────────────── */}
      {/* Orbit Default Background Video */}
      <div
        id="validator-orbit-backdrop"
        aria-hidden={selectedModel !== 'orbit'}
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 ease-in-out ${
          selectedModel === 'orbit' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
      >
        <HlsBackgroundVideo
          sources={VALIDATOR_VIDEO_SOURCES}
          rotationIntervalHours={ROTATION_INTERVAL_HOURS}
          isActive={isVideoBackgroundActive && selectedModel === 'orbit'}
          isResultActive={Boolean(result && !validating)}
        />
      </div>

      {/* Pulsar Streamable Embed Video Backdrop */}
      <div
        id="validator-pulsar-backdrop"
        aria-hidden={selectedModel !== 'pulsar'}
        className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-500 ease-in-out ${
          selectedModel === 'pulsar' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
      >
        <iframe
          src="https://streamable.com/e/7f2p9g?autoplay=1&muted=1&nocontrols=1&loop=1"
          title="Pulsar Atmosphere"
          frameBorder="0"
          allow="autoplay; fullscreen"
          tabIndex={-1}
          className="absolute pointer-events-none border-0 select-none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '100vh',
            minWidth: '177.78vh',
            minHeight: '56.25vw',
            transform: 'translate(-50%, -50%) scale(1.06)',
            pointerEvents: 'none',
          }}
        />
        {/* Soft contrast diffuser on results */}
        {Boolean(result && !validating) && (
          <div className="absolute inset-0 z-[4] pointer-events-none bg-[#F5F4F0]/75 backdrop-blur-[1px] transition-opacity duration-500" />
        )}
      </div>

      {/* Quasar Streamable Embed Video Backdrop */}
      <div
        id="validator-quasar-backdrop"
        aria-hidden={selectedModel !== 'quasar'}
        className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-500 ease-in-out ${
          selectedModel === 'quasar' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
      >
        <iframe
          src="https://streamable.com/e/7f2p9g?autoplay=1&muted=1&nocontrols=1&loop=1"
          title="Quasar Atmosphere"
          frameBorder="0"
          allow="autoplay; fullscreen"
          tabIndex={-1}
          className="absolute pointer-events-none border-0 select-none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '100vh',
            minWidth: '177.78vh',
            minHeight: '56.25vw',
            transform: 'translate(-50%, -50%) scale(1.06)',
            pointerEvents: 'none',
          }}
        />
        {/* Soft contrast diffuser on results */}
        {Boolean(result && !validating) && (
          <div className="absolute inset-0 z-[4] pointer-events-none bg-[#F5F4F0]/75 backdrop-blur-[1px] transition-opacity duration-500" />
        )}
      </div>

      {/* Conversation History Drawer */}
      <ConversationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        history={history}
        currentHistoryId={currentHistoryId}
        onSelectHistory={handleSelectHistoryItem}
        onNewChat={handleNewChat}
        onDeleteHistory={handleDeleteHistoryItem}
        onShareHistory={(item) => handleOpenShare({
          id: item.id,
          idea: item.idea,
          flaws: item.result?.flaws || [],
          similar_products: item.result?.similar_products || [],
          refined_versions: item.result?.refined_versions || [],
          messages: item.messages || [],
          createdAt: item.createdAt,
        })}
        loading={loadingHistory}
        onNavigate={onNavigate}
      />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-10">
        {/* Top Minimal Toolbar */}
        <div
          className={`flex items-center justify-between pb-6 mb-6 border-b transition-colors duration-500 ${
            isGlassMode ? 'border-white/20' : 'border-[#E0DEDA]/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              id="toggle-conversation-history-btn"
              type="button"
              onClick={() => {
                setIsDrawerOpen(true);
              }}
              className={`cursor-pointer inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg transition-all ${
                isGlassMode
                  ? 'text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md'
                  : 'text-[#111111] hover:text-black bg-white hover:bg-stone-50 border border-[#E0DEDA] shadow-2xs'
              }`}
              title="Open conversation history drawer"
            >
              <History className={`w-3.5 h-3.5 ${isGlassMode ? 'text-white' : 'text-[#7A7A7A]'}`} strokeWidth={1.5} />
              <span>
                History ({history.length})
              </span>
            </button>

            {!result && (
              <button
                id="load-demo-idea-btn"
                type="button"
                onClick={handleRunDemoIdea}
                disabled={validating}
                className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                  isGlassMode
                    ? 'text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md'
                    : 'text-[#111111] bg-white hover:bg-stone-50 border border-[#E0DEDA] shadow-2xs'
                }`}
                title="Run analysis on a sample demo startup idea"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E8481C]" />
                <span className="hidden sm:inline">
                  Try Demo Idea
                </span>
                <span className="sm:hidden">
                  Demo
                </span>
              </button>
            )}
          </div>

          {result && (
            <div className="flex items-center gap-2">
              <button
                id="new-check-topbar-btn"
                type="button"
                onClick={handleNewChat}
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-white bg-[#E8481C] hover:bg-[#D03D14] px-3.5 py-1.5 rounded-lg transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>New Check</span>
              </button>
            </div>
          )}
        </div>

        {/* 1. PERSONALIZED GREETING (Clean, large, minimal) */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 sm:mb-24 text-center sm:text-left"
          >
            <h1
              id="personalized-greeting-title"
              className={`text-2xl sm:text-4xl font-semibold tracking-tight break-words transition-colors duration-300 ${
                isGlassMode ? 'text-[#FFFFFF]' : 'text-[#111111]'
              }`}
            >
              {greeting}
            </h1>
          </motion.div>
        )}



        {/* 2. PROMINENT CHAT INPUT (Liquid glass treatment while video active, fading to solid on results) */}
        <div
          id="validator-input-card-container"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-3.5 sm:p-5 mb-6 relative transition-all duration-500 ease-in-out ${
            isGlassMode ? 'idea-input-card' : 'idea-input-card-solid'
          } ${
            isDragging
              ? 'border-2 border-dashed border-[#E8481C] bg-[#FFF8F6]'
              : ''
          }`}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-[#FFF8F6]/90 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-20">
              <UploadCloud className="w-10 h-10 text-[#E8481C] animate-bounce mb-2" strokeWidth={1.5} />
              <p className="font-semibold text-sm text-[#111111]">Drop Pitch Deck, Document, or Notes Here</p>
              <p className="text-xs text-[#5A5A5A] font-mono mt-1">Supports PDF, Markdown, TXT, JSON, CSV, DOCX, Images</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              id="idea-input-textarea"
              ref={textareaRef}
              rows={3}
              disabled={validating}
              placeholder={
                ideaText
                  ? ''
                  : placeholderText
                  ? `${placeholderText}${cursorVisible ? '|' : ' '}`
                  : 'What do you want checked or done?'
              }
              value={ideaText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onChange={(e) => {
                setIdeaText(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full p-2 sm:p-2.5 text-sm sm:text-base leading-relaxed resize-none disabled:opacity-50 transition-all duration-500 bg-transparent border-0 focus:ring-0 focus:outline-none ${
                isGlassMode
                  ? 'idea-glass-textarea'
                  : 'idea-solid-textarea'
              }`}
            />

            {/* Uploaded File Attachments List & Privacy Notice */}
            {attachedFiles.length > 0 && (
              <div
                className={`mt-3 pt-3 border-t space-y-2.5 transition-colors duration-500 ${
                  isGlassMode ? 'border-white/30' : 'border-[#E0DEDA]/60'
                }`}
              >
                {/* Short notice at upload required by product specification */}
                <div
                  className={`p-2.5 rounded-lg text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 border transition-colors ${
                    isGlassMode
                      ? 'bg-black/30 border-white/20 text-white/90'
                      : 'bg-[#F9F8F6] border-[#E0DEDA] text-[#4A4A4A]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                    <Shield className="w-3.5 h-3.5 text-[#E8481C] shrink-0" />
                    <span>Remove names and ID numbers if you can. Processed by AI providers, not stored by default.</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-[10px] select-none hover:text-[#111111] transition-colors">
                    <input
                      type="checkbox"
                      checked={keepAttachment}
                      onChange={(e) => setKeepAttachment(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#E8481C] focus:ring-0 cursor-pointer"
                    />
                    <span>Keep file in session</span>
                  </label>
                </div>

                <div
                  className={`text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-500 ${
                    isGlassMode ? 'text-white/80 idea-glass-subtle-shadow font-medium' : 'text-[#5A5A5A]'
                  }`}
                >
                  <Paperclip
                    className={`w-3 h-3 ${isGlassMode ? 'text-white/80 idea-glass-icon-shadow' : 'text-[#111111]'}`}
                  />
                  <span>Attached Documents ({attachedFiles.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedFiles.map((file) => (
                    <FileAttachmentCard
                      key={file.id}
                      file={file}
                      onRemove={handleRemoveAttachment}
                      isGlassMode={isGlassMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Uploading progress indicator */}
            {isUploading && (
              <div className="mt-2 text-xs font-mono text-[#5A5A5A] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8481C]" />
                <span className={`shimmer-text ${isGlassMode ? 'shimmer-text--light' : ''}`}>Extracting text & analyzing document...</span>
              </div>
            )}

            {/* Input Footer Controls */}
            <div
              className={`mt-3 pt-3 border-t flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 transition-colors duration-500 ${
                isGlassMode ? 'border-white/20' : 'border-[#E0DEDA]/60'
              }`}
            >
              {/* Accessory icons */}
              <div
                className={`flex items-center gap-1.5 sm:gap-2 flex-wrap transition-all duration-500 ${
                  isGlassMode ? 'text-white/80' : 'text-[#5A5A5A]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsListening(!isListening);
                  }}
                  className={`cursor-pointer p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isListening
                      ? 'text-[#E8481C] border-[#E8481C] bg-[#E8481C]/10'
                      : isGlassMode
                      ? 'border-transparent text-white/80 hover:text-white hover:bg-white/15'
                      : 'border-transparent text-[#7A7A7A] hover:text-[#111111] hover:bg-[#F5F4F0]'
                  }`}
                  title={isListening ? 'Stop voice input' : 'Voice input (experimental)'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 text-[#E8481C]" strokeWidth={1.5} />
                      <ThinkingOrb state="listening" size={20} theme="light" />
                    </>
                  ) : (
                    <Mic
                      className={`w-4 h-4 ${isGlassMode ? 'idea-glass-icon-shadow' : ''}`}
                      strokeWidth={1.5}
                    />
                  )}
                </button>

                <button
                  id="attach-file-btn"
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className={`cursor-pointer p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${
                    attachedFiles.length > 0
                      ? isGlassMode
                        ? 'text-white bg-white/20 border-white/30'
                        : 'text-[#111111] bg-[#F5F4F0] border-[#E0DEDA]'
                      : isGlassMode
                      ? 'border-transparent text-white/80 hover:text-white hover:bg-white/15'
                      : 'border-transparent text-[#7A7A7A] hover:text-[#111111] hover:bg-[#F5F4F0]'
                  }`}
                  title="Upload Pitch Deck, Document, PDF, or Notes"
                >
                  <Paperclip
                    className={`w-4 h-4 ${isGlassMode ? 'idea-glass-icon-shadow' : ''}`}
                    strokeWidth={1.5}
                  />
                  <span
                    className={`hidden sm:inline font-mono text-[11px] ${
                      isGlassMode ? 'idea-glass-subtle-shadow' : ''
                    }`}
                  >
                    {attachedFiles.length > 0 ? `${attachedFiles.length} file(s)` : 'Upload file'}
                  </span>
                </button>

                {/* Minimal Icon-based Mode Toggle: Validation vs Build */}
                <div
                  className={`inline-flex items-center rounded-lg p-0.5 border transition-all ${
                    isGlassMode
                      ? 'bg-black/40 border-white/20'
                      : 'bg-[#F2EFE9] border-[#E0DEDA]'
                  }`}
                  role="radiogroup"
                  aria-label="Select operation mode"
                >
                  <button
                    id="mode-toggle-validation-btn"
                    type="button"
                    onClick={() => {
                      setIsPlanToBuild(false);
                    }}
                    className={`cursor-pointer px-2 py-1 rounded-md text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      !isPlanToBuild
                        ? isGlassMode
                          ? 'bg-white/25 text-white shadow-xs'
                          : 'bg-white text-[#111111] shadow-xs'
                        : isGlassMode
                        ? 'text-white/60 hover:text-white'
                        : 'text-[#7A7A7A] hover:text-[#111111]'
                    }`}
                    title="Validation Mode: Search competitors & analyze flaws"
                    aria-label="Validation Mode"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E8481C]" />
                    <span className="hidden sm:inline">Validation</span>
                  </button>

                  <button
                    id="mode-toggle-build-btn"
                    type="button"
                    onClick={() => {
                      setIsPlanToBuild(true);
                    }}
                    className={`cursor-pointer px-2 py-1 rounded-md text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      isPlanToBuild
                        ? 'bg-[#E8481C] text-white shadow-xs'
                        : isGlassMode
                        ? 'text-white/60 hover:text-white'
                        : 'text-[#7A7A7A] hover:text-[#111111]'
                    }`}
                    title="Build Mode: Prepare coding task for AI Employees"
                    aria-label="Build Mode"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Build</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </button>
                </div>
              </div>

              {/* Right Side: Tier Selector Dropdown + Send/Validate Button */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Native hidden select for automation / programmatic control */}
                <select
                  id="model-selector-dropdown"
                  aria-label="Select AI Model"
                  value={selectedModel}
                  onChange={(e) => handleSelectModel(e.target.value as ModelId)}
                  className="sr-only"
                  tabIndex={-1}
                >
                  <option value="orbit">Orbit: Everyday</option>
                  <option value="pulsar">Pulsar: Advanced</option>
                  <option value="quasar">Quasar: Maximum</option>
                </select>

                {/* Interactive Custom Model Selector Dropdown */}
                {(() => {
                  const activeModel =
                    MODELS.find((m) => m.id === selectedModel) || MODELS[0];

                  return (
                    <div className="relative" ref={modelDropdownRef}>
                      <button
                        id="model-selector-dropdown-btn"
                        type="button"
                        onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 rounded-xl text-xs font-mono transition-all duration-200 border select-none ${
                          isGlassMode
                            ? selectedModel !== 'orbit'
                              ? 'tier-dropdown-btn-glass !border-[#E8481C] !bg-[#E8481C]/20 text-[#FFFFFF] font-semibold'
                              : 'tier-dropdown-btn-glass text-[#FFFFFF] hover:bg-white/15'
                            : selectedModel !== 'orbit'
                            ? 'bg-[#E8481C]/15 text-[#E8481C] border-[#E8481C] font-semibold shadow-xs'
                            : 'bg-[#F5F4F0] hover:bg-[#EBE9E4] text-[#111111] border-[#E0DEDA]'
                        }`}
                        title={`Selected AI Model: ${activeModel.label}`}
                        aria-label={`Current AI Model: ${activeModel.label}`}
                        aria-haspopup="listbox"
                        aria-expanded={isModelDropdownOpen}
                      >
                        <span className={`font-semibold tracking-tight ${isGlassMode ? 'text-[#FFFFFF] idea-glass-subtle-shadow' : 'text-[#111111]'}`}>
                          {activeModel.label}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isModelDropdownOpen
                              ? 'rotate-180 text-[#E8481C]'
                              : isGlassMode
                              ? 'text-white/80'
                              : 'text-[#333333]'
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu Popover */}
                      <AnimatePresence>
                        {isModelDropdownOpen && (
                          <motion.div
                            id="model-selector-dropdown-menu"
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute right-0 bottom-full mb-2 w-80 rounded-xl shadow-2xl z-50 p-2.5 select-none ${
                              isGlassMode
                                ? 'tier-dropdown-popover-glass'
                                : 'bg-white/95 backdrop-blur-xl border border-[#E0DEDA]'
                            }`}
                            role="listbox"
                            aria-label="Select AI Model"
                          >
                            <div
                              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold border-b pb-1.5 mb-2 flex items-center justify-between ${
                                isGlassMode
                                  ? 'text-white/70 border-white/20 idea-glass-subtle-shadow'
                                  : 'text-[#7A7A7A] border-[#E0DEDA]/60'
                              }`}
                            >
                              <span>AI Models</span>
                              <span className="text-[9px] text-[#E8481C] font-mono font-semibold">
                                Diagnostic Depth
                              </span>
                            </div>

                            <div className="tier-dropdown-scroll space-y-1.5 pr-1">
                              {MODELS.map((modelOpt) => {
                                const status = userModelStatuses[modelOpt.id];
                                const isSelected = selectedModel === modelOpt.id;
                                const isLocked = !status.isUnlocked;

                                return (
                                  <button
                                    key={modelOpt.id}
                                    id={`model-option-${modelOpt.id}`}
                                    type="button"
                                    onClick={() => handleSelectModel(modelOpt.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                                      isLocked
                                        ? 'opacity-65 hover:opacity-90 hover:bg-stone-500/10 border border-transparent'
                                        : isSelected
                                        ? 'bg-[#E8481C]/25 border-l-4 border-l-[#E8481C] border-y border-r border-transparent text-white shadow-xs'
                                        : isGlassMode
                                        ? 'hover:bg-white/15 text-white border border-transparent'
                                        : 'hover:bg-[#F5F4F0] text-[#333333] border border-transparent'
                                    }`}
                                    role="option"
                                    aria-selected={isSelected}
                                    title={
                                      isLocked
                                        ? `${modelOpt.name}: Locked — Click to view plans`
                                        : `Select ${modelOpt.label}`
                                    }
                                  >
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-xs font-bold ${isGlassMode ? 'text-[#FFFFFF] idea-glass-subtle-shadow' : 'text-[#111111]'}`}>
                                          {modelOpt.label}
                                        </span>

                                        {/* Status badge: locked vs subtle remaining status */}
                                        {isLocked ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>{modelOpt.name}: Locked</span>
                                          </span>
                                        ) : (
                                          <span
                                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                                              isSelected
                                                ? 'bg-[#E8481C] text-white font-semibold'
                                                : isGlassMode
                                                ? 'bg-white/20 text-white border border-white/25'
                                                : 'bg-stone-200 text-[#5A5A5A]'
                                            }`}
                                          >
                                            {status.statusText}
                                          </span>
                                        )}
                                      </div>

                                      <p
                                        className={`text-[11px] mt-1 leading-snug line-clamp-2 ${
                                          isGlassMode
                                            ? 'text-white/70 idea-glass-subtle-shadow'
                                            : 'text-[#5A5A5A]'
                                        }`}
                                      >
                                        {modelOpt.description}
                                      </p>

                                      {isLocked && (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-[#E8481C] font-semibold">
                                          <span>Upgrade to unlock</span>
                                          <ArrowUpRight className="w-3 h-3" />
                                        </div>
                                      )}
                                    </div>

                                    {isSelected && !isLocked && (
                                      <Check
                                        className="w-4 h-4 text-[#E8481C] shrink-0 ml-1"
                                        strokeWidth={2.5}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* Send / Validate / Build Button */}
                <button
                  id="find-the-flaws-btn"
                  type="submit"
                  disabled={!canSubmit}
                  className="cursor-pointer bg-[#E8481C] hover:bg-[#D03D14] text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  title={isPlanToBuild ? 'Run build task with AI employees (Enter)' : 'Submit idea to diagnose competitors and flaws (Enter)'}
                >
                  {validating ? (
                    <div className="flex items-center gap-2">
                      <ThinkingOrb state="working" size={20} theme="dark" />
                      <span className="hidden sm:inline font-mono text-xs">Analyzing...</span>
                    </div>
                  ) : isPlanToBuild ? (
                    <>
                      <Hammer className="w-4 h-4" strokeWidth={2} />
                      <span className="hidden sm:inline">Build with AI</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Find Flaws</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Compact Inline Status Indicator (Pill-shaped badge directly below input card) */}
        <AnimatePresence>
          {validating && (
            <motion.div
              id="validating-status-badge"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-start -mt-2 mb-6"
            >
              <div
                id="loading-status-pill"
                className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-none select-none max-h-[36px] transition-colors duration-500 ${
                  isGlassMode
                    ? 'bg-black/40 border-white/20 backdrop-blur-md'
                    : 'bg-[#FFFFFF] border-[#E0DEDA]'
                }`}
              >
                {/* Left side: hand-tuned ThinkingOrb animation */}
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                  <ThinkingOrb
                    state={LOADING_STEPS[loadingStepIndex % LOADING_STEPS.length].state}
                    size={20}
                    theme={isGlassMode ? "dark" : "light"}
                  />
                </div>
                {/* Right side: rotating short monospace status text with continuous shimmer */}
                <div className={`h-5 flex items-center shimmer-text ${isGlassMode ? 'shimmer-text--light' : ''}`}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={loadingStepIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs sm:text-[13px] font-mono whitespace-nowrap"
                    >
                      {LOADING_STEPS[loadingStepIndex % LOADING_STEPS.length].text}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
          <div
            id="submit-error-banner"
            className="mb-6 bg-[#FFFFFF] border border-[#E0DEDA] rounded-xl p-4 flex items-start gap-3 text-xs text-[#111111]"
          >
            <AlertCircle className="w-4 h-4 text-[#E8481C] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold block mb-0.5">Validation Notice</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 3. RESULTS SECTION */}

        <div ref={resultsRef}>
          <ResultsErrorBoundary onReset={handleNewChat}>
            {result && !validating && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                {/* Submission Header Card with Controls */}
                <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0DEDA] pb-4 mb-4">
                    <div>
                      <span className="text-xs font-mono text-[#5A5A5A] uppercase tracking-wider block mb-1">
                        Evaluated Idea
                      </span>
                      <p className="text-sm font-semibold text-[#111111] leading-relaxed">
                        "{result.idea}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0 flex-wrap">
                      <button
                        id="share-report-btn"
                        onClick={() => handleOpenShare()}
                        className="cursor-pointer h-8 px-3 rounded-lg text-xs font-mono font-semibold bg-[#E8481C] hover:bg-[#D03D14] text-white flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Share official idea report"
                      >
                        <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Share Report</span>
                      </button>

                      <button
                        id="discuss-idea-meeting-btn"
                        type="button"
                        onClick={() => {
                          onNavigate('/flaw/teammates', JSON.stringify({ mode: 'meeting', topic: result.idea }));
                        }}
                        className="cursor-pointer h-8 px-3 rounded-lg text-xs font-mono font-semibold bg-[#111111] hover:bg-black text-white flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Discuss this idea with AI Teammates in voice meeting"
                      >
                        <Users className="w-3.5 h-3.5 text-[#E8481C]" strokeWidth={2} />
                        <span>Discuss with Team</span>
                      </button>

                      <button
                        id="read-aloud-tts-btn"
                        type="button"
                        onClick={() => {
                          const fullScript = ttsManager.buildTeardownNarration(result);
                          if (ttsState.isPlaying && ttsState.currentText === fullScript) {
                            ttsManager.stop();
                          } else {
                            ttsManager.play(fullScript, 'Fenrir');
                          }
                        }}
                        className={`cursor-pointer h-8 px-3 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                          ttsState.isPlaying
                            ? 'bg-[#111111] text-white border border-[#111111]'
                            : 'bg-white border border-[#E0DEDA] hover:bg-stone-50 text-[#111111]'
                        }`}
                        title="Read full teardown aloud in bold male voice (Fenrir)"
                      >
                        {ttsState.isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#E8481C]" strokeWidth={1.8} />
                            <span>Voice Read</span>
                          </>
                        )}
                      </button>

                      <button
                        id="export-pdf-btn"
                        onClick={() => exportAnalysisToJsPdf(result)}
                        className="cursor-pointer h-8 bg-white border border-[#E0DEDA] hover:bg-stone-50 text-[#111111] px-3 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                        title="Download clean executive PDF report"
                      >
                        <Download className="w-3.5 h-3.5 text-[#5A5A5A]" strokeWidth={1.5} />
                        <span>PDF</span>
                      </button>

                      <button
                        id="publish-gallery-btn"
                        onClick={handleSaveToGallery}
                        disabled={savedGallery || savingGallery}
                        className={`cursor-pointer h-8 px-3 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                          savedGallery
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-white border border-[#E0DEDA] hover:bg-stone-50 text-[#111111]'
                        }`}
                        title="Publish to community gallery"
                      >
                        {savedGallery ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                            <span>In Gallery</span>
                          </>
                        ) : (
                          <>
                            <Compass className="w-3.5 h-3.5 text-[#5A5A5A]" strokeWidth={1.5} />
                            <span>{savingGallery ? 'Publishing...' : 'Add to Gallery'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#5A5A5A] font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {result.skill && result.skill !== 'idea_validation' && (result.short_answer || (result.key_findings && result.key_findings.length > 0))
                        ? 'Analysis Complete'
                        : 'Live Grounding Validated'}
                    </span>
                    <span>
                      {result.skill && result.skill !== 'idea_validation' && (result.short_answer || (result.key_findings && result.key_findings.length > 0))
                        ? `${(result.key_findings || []).length} key findings • ${(result.risks_or_questions || []).length} risks/questions`
                        : `${(result.flaws || []).length} flaws • ${(result.similar_products || []).length} competitors cited`}
                    </span>
                  </div>
                </div>

                {/* DEDICATED GENERAL SKILL OUTPUT FORMAT (when not startup validation) */}
                {result.skill && result.skill !== 'idea_validation' && (result.short_answer || (result.key_findings && result.key_findings.length > 0)) ? (
                  <div className="space-y-6">
                    {/* Disclaimer Banner for Health, Legal, Financial */}
                    {result.disclaimer && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-950">Notice</div>
                          <p className="text-sm text-amber-900 font-medium">{result.disclaimer}</p>
                        </div>
                      </div>
                    )}

                    {/* 1. Short Answer First */}
                    {result.short_answer && (
                      <section className="bg-white border border-[#E0DEDA] rounded-xl p-5 sm:p-6 shadow-xs">
                        <div className="text-xs font-mono uppercase text-[#E8481C] font-semibold mb-2">Short Answer & Overview</div>
                        <div className="text-base text-[#111111] leading-relaxed font-medium">
                          <RenderClickableText text={result.short_answer} />
                        </div>
                      </section>
                    )}

                    {/* Visual Color Palette & WCAG Contrast Metrics */}
                    {result.computed_palette && result.computed_palette.colors && result.computed_palette.colors.length > 0 && (
                      <section className="bg-white border border-[#E0DEDA] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E0DEDA] pb-3">
                          <div>
                            <div className="text-xs font-mono uppercase text-[#E8481C] font-semibold">
                              Code-Computed Color Palette & Contrast Matrix
                            </div>
                            <p className="text-xs text-[#5A5A5A] mt-0.5">
                              Calculated algorithmically using WCAG 2.1 relative luminance formulas.
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold self-start sm:self-auto">
                            WCAG 2.1 Evaluated
                          </span>
                        </div>

                        {/* Color Chips Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {result.computed_palette.colors.map((c, i) => (
                            <div key={i} className="rounded-lg border border-[#E0DEDA] p-3 space-y-2 bg-[#F9F8F6]">
                              <div
                                className="w-full h-12 rounded-md border border-black/10 shadow-inner flex items-center justify-center font-mono text-xs font-bold"
                                style={{
                                  backgroundColor: c.hex,
                                  color: c.contrastWithWhite > 4.5 ? '#FFFFFF' : '#000000',
                                }}
                              >
                                {c.hex}
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-bold text-[#111111] truncate">{c.role}</div>
                                <div className="text-[10px] font-mono text-[#5A5A5A]">
                                  vs White: <span className={c.contrastWithWhite >= 4.5 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{c.contrastWithWhite}:1</span>
                                </div>
                                <div className="text-[10px] font-mono text-[#5A5A5A]">
                                  vs Black: <span className={c.contrastWithBlack >= 4.5 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{c.contrastWithBlack}:1</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {result.computed_palette.wcag_notes && (
                          <div className="text-xs font-mono text-[#5A5A5A] bg-[#F5F4F0] p-3 rounded-lg border border-[#E0DEDA]">
                            {result.computed_palette.wcag_notes}
                          </div>
                        )}
                      </section>
                    )}

                    {/* 2. Key Findings with Sources or Quotes */}
                    {result.key_findings && result.key_findings.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#111111]">1. Key Findings</h2>
                            <p className="text-xs text-[#5A5A5A] mt-0.5">Objective observations, quotes, and extracted points.</p>
                          </div>
                          <span className="text-xs font-mono bg-white border border-[#E0DEDA] px-2 py-1 rounded">
                            {result.key_findings.length} findings
                          </span>
                        </div>
                        <div className="space-y-3">
                          {result.key_findings.map((finding, idx) => (
                            <div key={idx} className="bg-white border border-[#E0DEDA] rounded-xl p-5 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-sm font-bold text-[#111111]">{finding.title}</h3>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 text-[#5A5A5A]">#{idx + 1}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{finding.explanation}</p>
                              {finding.source_or_quote && (
                                <div className="text-xs font-mono bg-[#F9F8F6] border border-[#E0DEDA]/70 rounded-lg p-2.5 text-[#5A5A5A] flex items-start gap-2">
                                  <span className="font-semibold text-[#111111] shrink-0">Source / Quote:</span>
                                  <div className="flex-1">
                                    <RenderClickableText text={finding.source_or_quote} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 3. Risks or Open Questions */}
                    {result.risks_or_questions && result.risks_or_questions.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#111111]">2. Risks & Open Questions</h2>
                            <p className="text-xs text-[#5A5A5A] mt-0.5">Potential vulnerabilities, discrepancies, or flags requiring verification.</p>
                          </div>
                          <span className="text-xs font-mono bg-white border border-[#E0DEDA] px-2 py-1 rounded">
                            {result.risks_or_questions.length} items
                          </span>
                        </div>
                        <div className="space-y-3">
                          {result.risks_or_questions.map((rq, idx) => {
                            const severity = rq.severity || 'medium';
                            const badgeColor =
                              severity === 'high'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : severity === 'medium'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200';
                            return (
                              <div key={idx} className="bg-white border border-[#E0DEDA] rounded-xl p-5 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="text-sm font-bold text-[#111111]">{rq.title}</h3>
                                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                                    {severity}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{rq.explanation}</p>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* 4. Recommended Next Steps */}
                    {result.next_steps && result.next_steps.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#111111]">3. Recommended Next Steps</h2>
                            <p className="text-xs text-[#5A5A5A] mt-0.5">Sequential concrete actions to take based on the evaluation.</p>
                          </div>
                          <span className="text-xs font-mono bg-white border border-[#E0DEDA] px-2 py-1 rounded">
                            {result.next_steps.length} steps
                          </span>
                        </div>
                        <div className="space-y-3">
                          {result.next_steps.map((ns, idx) => (
                            <div key={idx} className="bg-white border border-[#E0DEDA] rounded-xl p-5 flex items-start gap-4">
                              <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="space-y-1 flex-1">
                                <h3 className="text-sm font-bold text-[#111111]">{ns.step}</h3>
                                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">{ns.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Section 1: Similar Products / Competitors */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                            1. Similar Products on the Live Web
                          </h2>
                          <p className="text-xs text-[#5A5A5A] mt-0.5">
                            Real competitors and incumbents discovered via live web search.
                          </p>
                        </div>
                        <span className="text-xs font-mono bg-[#FFFFFF] border border-[#E0DEDA] px-2 py-1 rounded">
                          {(result.similar_products || []).length} found
                        </span>
                      </div>

                      {(!result.similar_products || result.similar_products.length === 0) ? (
                        <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg p-6 text-sm text-[#5A5A5A]">
                          No direct live competitors discovered. Proceed to flaw diagnostics below.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.similar_products.map((prod, idx) => (
                            <CompetitorCard
                              key={idx}
                              product={prod}
                              competitor={prod}
                              index={idx}
                            />
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Dedicated Separate Graveyard Page Banner with Pixel UI (Only for startup ideas with graveyard precedents) */}
                    {result.skill === 'idea_validation' && result.graveyard && result.graveyard.length > 0 && (
                      <div className="bg-[#111111] text-[#E9ECEA] border-2 border-[#111111] rounded-xl p-5 my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_#E8481C] font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Skull className="w-4 h-4 text-[#E8481C]" />
                            <span
                              className="text-sm font-bold uppercase tracking-wider text-white"
                              style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                            >
                              The Startup Graveyard ({result.graveyard.length} Precedents)
                            </span>
                          </div>
                          <p className="text-xs text-[#A0A0A0]">
                            Explore full post-mortems and defense lessons for failed startups in this category on the dedicated Pixel UI page.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate('/flaw/graveyard')}
                          className="px-4 py-2.5 bg-[#E8481C] hover:bg-[#d63f15] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                        >
                          <span>Open Graveyard Page</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Section 2: Brutal Flaws */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                            2. Diagnosed Flaws & Structural Risks
                          </h2>
                          <p className="text-xs text-[#5A5A5A] mt-0.5">
                            Specific breakdowns of why this model struggles before scale.
                          </p>
                        </div>
                        <span className="text-xs font-mono bg-[#E8481C]/10 text-[#E8481C] border border-[#E8481C]/30 px-2 py-1 rounded font-semibold">
                          {(result.flaws || []).length} diagnosed
                        </span>
                      </div>

                      {(!result.flaws || result.flaws.length === 0) ? (
                        <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg p-6 text-sm text-[#5A5A5A]">
                          No critical flaws identified for this concept.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {result.flaws.map((flaw, idx) => (
                            <FlawCard key={idx} flaw={flaw} index={idx} />
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Section 3: Refined Versions */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                            3. Refined Counter-Proposals
                          </h2>
                          <p className="text-xs text-[#5A5A5A] mt-0.5">
                            Pivoted concepts designed to bypass the diagnosed flaws. Click any card to iterate.
                          </p>
                        </div>
                        <span className="text-xs font-mono bg-[#FFFFFF] border border-[#E0DEDA] px-2 py-1 rounded">
                          {(result.refined_versions || []).length} proposals
                        </span>
                      </div>

                      {(!result.refined_versions || result.refined_versions.length === 0) ? (
                        <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg p-6 text-sm text-[#5A5A5A]">
                          No refined versions generated.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {result.refined_versions.map((version, idx) => (
                            <RefinementCard
                              key={idx}
                              version={version}
                              refinement={version}
                              index={idx}
                              onSelect={handleSelectRefinedVersion}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* Section 4: Follow-up Conversation */}
                <section id="followup-conversation-section" className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                        4. Follow-up Discussion
                      </h2>
                      <p className="text-xs text-[#5A5A5A] mt-0.5">
                        Ask clarifying questions, push back on diagnosed flaws, or explore tactical pivots.
                      </p>
                    </div>
                    {followUpMessages.length > 0 && (
                      <span className="text-xs font-mono bg-[#FFFFFF] border border-[#E0DEDA] px-2 py-1 rounded">
                        {followUpMessages.length} {followUpMessages.length === 1 ? 'message' : 'messages'}
                      </span>
                    )}
                  </div>

                  {followUpMessages.length === 0 ? (
                    <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-xl p-5 text-xs text-[#5A5A5A] leading-relaxed">
                      Have a counter-argument or need clarification on a competitor or flaw? Use the prompt bar below to push back or explore adjustments with Flawlesz AI.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {followUpMessages.map((msg) => (
                        msg.role === 'user' ? (
                          <div key={msg.id} className="flex justify-end">
                            <div className="max-w-2xl bg-[#FFFFFF] border border-[#E0DEDA] rounded-xl p-4 text-sm text-[#111111] leading-relaxed shadow-none">
                              <span className="text-[11px] font-mono text-[#7A7A7A] uppercase tracking-wider block mb-1.5 font-semibold">
                                You
                              </span>
                              <RenderClickableText text={msg.content} />
                            </div>
                          </div>
                        ) : (
                          <div key={msg.id} className="flex justify-start">
                            <div className="max-w-3xl w-full bg-[#FFFFFF] border border-[#E0DEDA] rounded-xl p-5 text-sm text-[#111111] leading-relaxed shadow-none">
                              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E0DEDA]/60">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                                    Flawlesz AI
                                  </span>
                                  <span className="text-[10px] font-mono text-[#7A7A7A]">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (ttsState.isPlaying && ttsState.currentText === msg.content) {
                                      ttsManager.stop();
                                    } else {
                                      ttsManager.play(msg.content, 'Fenrir');
                                    }
                                  }}
                                  className={`cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                    ttsState.isPlaying && ttsState.currentText === msg.content
                                      ? 'bg-[#111111] text-[#FFFFFF]'
                                      : 'bg-[#F2EFE9] text-[#111111] hover:bg-[#E0DEDA]'
                                  }`}
                                  title="Listen in bold male voice"
                                >
                                  {ttsState.isPlaying && ttsState.currentText === msg.content ? (
                                    <>
                                      <Square className="w-2.5 h-2.5 fill-current" />
                                      <span>Stop</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-[#5A5A5A]" />
                                      <span>Listen</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="prose prose-sm max-w-none text-[#111111] leading-relaxed whitespace-pre-wrap font-sans">
                                <ReactMarkdown
                                  components={{
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-[#111111]" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="underline text-[#E8481C] hover:text-[#D03D14] inline-flex items-center gap-1 transition-colors font-medium break-all" {...props} />,
                                    em: ({ node, ...props }) => <em className="italic" {...props} />
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Compact inline loading pill when sending follow-up with URL or query */}
                  {sendingFollowUp && (
                    <div className="flex items-center justify-start mt-4">
                      {(() => {
                        const activeSteps = inspectingDomain
                          ? [
                              { text: `Reading ${inspectingDomain}...`, state: 'connecting' as const },
                              { text: `Analyzing ${inspectingDomain} content...`, state: 'solving' as const },
                              { text: 'Formulating grounded response...', state: 'weaving' as const },
                            ]
                          : isPlanToBuild
                          ? [
                              { text: 'Coordinator orchestrating AI Teammates...', state: 'solving' as const },
                              { text: 'Specialist models executing subtasks...', state: 'weaving' as const },
                              { text: 'Synthesizing Plan to Build roadmap...', state: 'connecting' as const },
                            ]
                          : FOLLOW_UP_STEPS;
                        const currentStep = activeSteps[loadingStepIndex % activeSteps.length];
                        return (
                          <div
                            id="followup-loading-pill"
                            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E0DEDA] shadow-none select-none max-h-[36px]"
                          >
                            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                              <ThinkingOrb
                                state={currentStep.state}
                                size={20}
                                theme="light"
                              />
                            </div>
                            <div className="h-5 flex items-center shimmer-text">
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                  key={currentStep.text}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-xs sm:text-[13px] font-mono whitespace-nowrap"
                                >
                                  {currentStep.text}
                                </motion.span>
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Follow-up Specific Error Banner */}
                  {followUpError && (
                    <div className="mt-4 p-3.5 bg-[#FFF5F3] border border-[#FCDAD1] rounded-xl text-xs text-[#E8481C] flex items-start gap-2.5 font-mono leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="flex-1">
                        <span className="font-bold block mb-0.5">Follow-up Error</span>
                        <span>{followUpError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFollowUpError(null)}
                        className="text-[#E8481C]/70 hover:text-[#E8481C] p-0.5"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div ref={followUpBottomRef} />
                </section>

                {/* Bottom Actions */}
                <div className="pt-6 border-t border-[#E0DEDA] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    id="retest-bottom-btn"
                    onClick={handleNewChat}
                    className="cursor-pointer w-full sm:w-auto bg-[#111111] text-white hover:bg-black transition-colors px-6 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                    <span>Test Another Idea</span>
                  </button>

                  <button
                    type="button"
                    id="browse-gallery-bottom-link"
                    onClick={() => onNavigate('/flaw/gallery')}
                    className="cursor-pointer text-xs font-mono text-[#5A5A5A] hover:text-[#111111] flex items-center gap-1.5 transition-colors"
                    title="Open Public Gallery"
                  >
                    <span>Explore Public Gallery</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#7A7A7A]" strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            )}
          </ResultsErrorBoundary>
        </div>

        {/* 5. PERSISTENT FIXED BOTTOM CHAT INPUT FOR FOLLOW-UPS & PLAN TO BUILD */}
        {result && !validating && (
          <div className="fixed bottom-0 left-0 right-0 w-full z-30 pointer-events-none px-3 sm:px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F5F4F0] via-[#F5F4F0]/95 to-transparent overflow-x-hidden">
            <div className="w-full max-w-3xl mx-auto pointer-events-auto">
              <form
                id="followup-chat-form"
                onSubmit={handleSendFollowUp}
                className={`w-full bg-[#FFFFFF] border rounded-xl p-1 sm:p-1.5 flex items-center gap-1.5 sm:gap-2 shadow-none transition-all overflow-hidden ${
                  isPlanToBuild
                    ? 'border-[#E8481C] ring-2 ring-[#E8481C]/20 shadow-xs'
                    : 'border-[#E0DEDA] focus-within:border-[#111111]'
                }`}
              >
                {/* Small minimal icon-based toggle button to shift to plan to build */}
                <button
                  id="toggle-plan-to-build-btn"
                  type="button"
                  onClick={() => {
                    setIsPlanToBuild((prev) => !prev);
                  }}
                  className={`cursor-pointer transition-all w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center flex-shrink-0 relative ${
                    isPlanToBuild
                      ? 'bg-[#E8481C] text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-[#5A5A5A] hover:text-[#111111]'
                  }`}
                  title={
                    isPlanToBuild
                      ? 'Build mode: ACTIVE (Type task & send to open workspace)'
                      : 'Toggle Build mode'
                  }
                  aria-label="Toggle Build mode"
                >
                  <Hammer className="w-4 h-4" strokeWidth={1.75} />
                  {isPlanToBuild && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
                  )}
                </button>

                {isPlanToBuild && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFF4F2] text-[#E8481C] border border-[#FCDAD1] font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8481C] animate-pulse" />
                    Plan to Build
                  </span>
                )}

                <input
                  id="followup-chat-input"
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  disabled={sendingFollowUp}
                  placeholder={
                    isPlanToBuild
                      ? 'Assign task to AI Teammates (e.g., MVP architecture, code scaffold, launch roadmap)...'
                      : 'Ask a follow-up, push back, or paste a URL to inspect...'
                  }
                  className="flex-1 min-w-0 w-full bg-transparent border-0 text-xs sm:text-sm text-[#111111] placeholder:text-[#7A7A7A] focus:outline-none px-2 sm:px-3 py-2 font-sans"
                />

                <button
                  id="followup-send-btn"
                  type="submit"
                  disabled={!followUpInput.trim() || sendingFollowUp}
                  className="cursor-pointer bg-[#E8481C] hover:bg-[#D03D14] text-white w-9 h-9 min-w-[36px] min-h-[36px] p-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-xs"
                  title={isPlanToBuild ? 'Assign task to AI Teammates' : 'Send follow-up'}
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={2} />
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Floating Audio Teardown Player */}
        <AudioTeardownPlayer />

        {/* Official Share Modal */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          ideaData={shareModalData}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};
